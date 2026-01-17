import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sortObject, vnpayConfig } from '@/lib/vnpay';
import { dbConnect } from '@/lib/dbConnect';
import { Payment, Booking, Trip } from '@/models/models';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let vnp_Params: any = {};
    
    // 1. Lấy params
    searchParams.forEach((value, key) => {
      vnp_Params[key] = value;
    });

    // 2. Tách Hash ra
    const secureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    // 3. Sắp xếp params
    vnp_Params = sortObject(vnp_Params);
    
    // 4. TẠO CHỮ KÝ (Fix: Dùng thuật toán giống hệt lúc tạo URL)
    // Phải encode URI và đổi khoảng trắng thành dấu cộng (+)
    const signData = Object.keys(vnp_Params)
      .map(key => {
        return `${key}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+")}`;
      })
      .join('&');

    const secretKey = vnpayConfig.hashSecret;
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");     

    console.log("--- VNPAY IPN CALLBACK ---");
    console.log("VNPAY Hash:", secureHash);
    console.log("My Hash:   ", signed);
    console.log("All params:", vnp_Params);
    
    if (secureHash === signed) {
      const orderId = vnp_Params['vnp_TxnRef'];
      const rspCode = vnp_Params['vnp_ResponseCode'];
      const vnpayTransactionNo = vnp_Params['vnp_TransactionNo'];
      const amount = Number(vnp_Params['vnp_Amount']) / 100;

      console.log("Order ID:", orderId);
      console.log("Response Code:", rspCode);
      console.log("VNPay Transaction No:", vnpayTransactionNo);
      console.log("Amount:", amount);

      await dbConnect();
      let payment: any = await Payment.findOne({ transactionId: orderId }).lean();

      console.log("Payment found:", payment ? 'YES' : 'NO');
      if (!payment) {
        // Try fallback by parsing bookingId from OrderInfo
        const orderInfo = vnp_Params['vnp_OrderInfo'] || '';
        const m = typeof orderInfo === 'string' ? orderInfo.match(/Thanh toan ve (.+)/) : null;
        if (m && m[1]) {
          const fallbackBookingId = m[1];
          payment = await Payment.findOne({ bookingId: fallbackBookingId }).lean();
          if (payment) console.log('Found payment by bookingId fallback:', fallbackBookingId);
        }
      }

      if (!payment) {
        console.error("Payment not found for orderId:", orderId);
        return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
      }

      console.log("Payment status:", payment.status);
      console.log("Payment bookingId:", payment.bookingId);
      
      // ✅ IDEMPOTENCY: Kiểm tra payment đã được xử lý chưa
      if (payment.status === 'success') {
        console.log("⚠️ Payment already confirmed - Idempotent request");
        return NextResponse.json({ RspCode: '00', Message: 'Order already confirmed' });
      }
      
      // ✅ Kiểm tra expiration (tuy nhiên VNPay vẫn có thể gửi IPN cho expired payment)
      if (payment.expiresAt && new Date() > new Date(payment.expiresAt)) {
        console.warn("⚠️ Payment link expired but VNPay still sent IPN");
        // Vẫn xử lý nếu thành công vì user đã trả tiền
      }

      if (rspCode === '00') {
        console.log("Processing successful payment...");
        // --- Cập nhật Thành công ---
        const updatedPayment = await Payment.findOneAndUpdate(
          { _id: payment._id },
          {
            status: 'success',
            paymentDate: new Date(),
            bankCode: vnp_Params['vnp_BankCode'],
            vnpayTransactionNo: vnpayTransactionNo
          },
          { new: true }
        );
        console.log("Payment updated to success:", updatedPayment ? 'YES' : 'NO');

        console.log("Updating booking:", payment.bookingId);
        // ✅ ATOMIC UPDATE: Chỉ update nếu booking chưa confirmed (tránh race condition)
        const booking = await Booking.findOneAndUpdate(
          { 
            _id: payment.bookingId,
            status: { $in: ['pending_payment', 'confirmed'] } // Cho phép cả confirmed (idempotent)
          },
          { 
            status: 'confirmed', 
            updatedAt: new Date() 
          },
          { new: true }
        );

        console.log("Booking updated:", booking ? 'YES' : 'NO');
        console.log("Booking new status:", booking?.status);
        
        if (!booking) {
          console.error("Booking not found or already cancelled:", payment.bookingId);
          // Vẫn trả success cho VNPay để tránh retry vô hạn
          return NextResponse.json({ RspCode: '00', Message: 'Booking not found or cancelled' });
        }

        // ✅ Cập nhật ghế trong Trip (đơn giản hơn, không cần điều kiện phức tạp)
        console.log("Updating trip seats for tripId:", booking.tripId);
        const tripUpdate: any = {};
        booking.seatCodes.forEach((code: string) => {
          tripUpdate[`seatsStatus.${code}.status`] = 'booked';
          tripUpdate[`seatsStatus.${code}.bookingId`] = booking._id;
        });
        
        const tripUpdateResult = await Trip.findByIdAndUpdate(
          booking.tripId,
          { $set: tripUpdate },
          { new: true }
        );
        console.log("Trip seats updated:", tripUpdateResult ? 'YES' : 'NO');
        
        console.log("✅ Payment processed successfully!");
        
        // Emit Socket.IO event để cập nhật dashboard real-time
        try {
          const io = (global as any).io;
          if (io) {
            // Populate trip để lấy companyId
            const trip = await Trip.findById(booking.tripId).select('companyId');
            if (trip && trip.companyId) {
              const roomName = `company_${trip.companyId}`;
              console.log(`📡 Emitting new_booking to room: ${roomName}`);
              
              io.to(roomName).emit('new_booking', {
                bookingId: booking._id,
                amount: payment.amount,
                customerName: booking.customerInfo?.name,
                seats: booking.seatCodes,
                timestamp: new Date()
              });
              
              console.log('✅ Socket event emitted successfully');
            } else {
              console.warn('⚠️ No companyId found for trip:', booking.tripId);
            }
          } else {
            console.warn('⚠️ Socket.IO instance not available');
          }
        } catch (socketError) {
          console.error('❌ Socket emit error:', socketError);
        }
        
        return NextResponse.json({ RspCode: '00', Message: 'Success' });
        } else {
        // --- Thất bại ---
        console.log("Payment failed with code:", rspCode);
        try {
          await Payment.findOneAndUpdate({ _id: payment._id }, { status: 'failed' });
        } catch (e) {
          console.error('Failed to mark payment as failed:', e);
        }
        await Booking.findByIdAndUpdate(payment.bookingId, { status: 'cancelled' });
        console.log("Booking cancelled due to payment failure");
        return NextResponse.json({ RspCode: '00', Message: 'Success' });
      }
    } else {
      console.error("❌ Signature verification failed!");
      console.error("Expected:", signed);
      console.error("Received:", secureHash);
      return NextResponse.json({ RspCode: '97', Message: 'Fail checksum' });
    }
  } catch (error) {
    console.error("❌ IPN Error:", error);
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' });
  }
}
