import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sortObject, vnpayConfig } from '@/lib/vnpay';
import { dbConnect } from '@/lib/dbConnect';
import { Payment, Booking, Trip } from '@/models/models';

/**
 * API để xử lý kết quả thanh toán từ VNPay Return URL
 * Thay thế IPN cho development/localhost (VNPay không gọi được IPN về localhost)
 */
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
    
    // 4. Tạo chữ ký để verify
    const signData = Object.keys(vnp_Params)
      .map(key => {
        return `${key}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+")}`;
      })
      .join('&');

    const secretKey = vnpayConfig.hashSecret;
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");     

    console.log("--- VNPAY RETURN URL VERIFY ---");
    console.log("VNPAY Hash:", secureHash);
    console.log("My Hash:   ", signed);
    
    // 5. Verify signature
    if (secureHash !== signed) {
      console.error("❌ Signature verification failed!");
      return NextResponse.json({ 
        success: false, 
        verified: false,
        message: 'Invalid signature' 
      });
    }

    const orderId = vnp_Params['vnp_TxnRef'];
    const rspCode = vnp_Params['vnp_ResponseCode'];
    const vnpayTransactionNo = vnp_Params['vnp_TransactionNo'];
    const amount = Number(vnp_Params['vnp_Amount']) / 100;

    console.log("✅ Signature verified!");
    console.log("Order ID:", orderId);
    console.log("Response Code:", rspCode);

    await dbConnect();
    const payment = await Payment.findOne({ transactionId: orderId }).lean();
    
    if (!payment) {
      return NextResponse.json({ 
        success: false, 
        verified: true,
        message: 'Payment not found' 
      });
    }

    // Nếu payment đã success -> trả về luôn
    if (payment.status === 'success') {
      return NextResponse.json({ 
        success: true, 
        verified: true,
        alreadyProcessed: true,
        message: 'Payment already confirmed' 
      });
    }

    // Xử lý payment nếu thành công
    if (rspCode === '00') {
      console.log("Processing successful payment...");
      
      // Update payment
      await Payment.findByIdAndUpdate(payment._id, {
        status: 'success',
        paymentDate: new Date(),
        bankCode: vnp_Params['vnp_BankCode'],
        vnpayTransactionNo: vnpayTransactionNo
      });

      // Update booking
      const booking = await Booking.findOneAndUpdate(
        { 
          _id: payment.bookingId,
          status: { $in: ['pending_payment', 'confirmed'] }
        },
        { 
          status: 'confirmed', 
          updatedAt: new Date() 
        },
        { new: true }
      );

      if (booking) {
        // Update seats
        const tripUpdate: any = {};
        booking.seatCodes.forEach((code: string) => {
          tripUpdate[`seatsStatus.${code}.status`] = 'booked';
          tripUpdate[`seatsStatus.${code}.bookingId`] = booking._id;
        });
        
        await Trip.findByIdAndUpdate(booking.tripId, { $set: tripUpdate });

        // Emit Socket.IO
        try {
          const io = (global as any).io;
          if (io) {
            const trip = await Trip.findById(booking.tripId).select('companyId');
            if (trip?.companyId) {
              io.to(`company_${trip.companyId}`).emit('new_booking', {
                bookingId: booking._id,
                amount: payment.amount,
                customerName: booking.customerInfo?.name,
                seats: booking.seatCodes,
                timestamp: new Date()
              });
            }
          }
        } catch (socketError) {
          console.error('Socket emit error:', socketError);
        }

        console.log("✅ Payment processed successfully!");
        return NextResponse.json({ 
          success: true, 
          verified: true,
          message: 'Payment confirmed' 
        });
      }
    } else {
      // Payment failed
      await Payment.findByIdAndUpdate(payment._id, { status: 'failed' });
      await Booking.findByIdAndUpdate(payment.bookingId, { status: 'cancelled' });
      
      return NextResponse.json({ 
        success: false, 
        verified: true,
        message: 'Payment failed' 
      });
    }

    return NextResponse.json({ 
      success: false, 
      verified: true,
      message: 'Unknown error' 
    });

  } catch (error) {
    console.error("❌ Return URL Verify Error:", error);
    return NextResponse.json({ 
      success: false, 
      verified: false,
      message: 'Server error' 
    });
  }
}
