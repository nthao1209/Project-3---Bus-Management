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

    console.log("--- DEBUG CHECK SUM ---");
    console.log("VNPAY Hash:", secureHash);
    console.log("My Hash:   ", signed);
    
    // 5. So sánh
    if (secureHash === signed) {
      const orderId = vnp_Params['vnp_TxnRef'];
      const rspCode = vnp_Params['vnp_ResponseCode'];
      // const amount = Number(vnp_Params['vnp_Amount']) / 100;

      await dbConnect();
      const payment = await Payment.findOne({ transactionId: orderId });
      
      if (!payment) return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
      if (payment.status === 'success') return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' });

      if (rspCode === '00') {
        // --- Cập nhật Thành công ---
        payment.status = 'success';
        payment.paymentDate = new Date();
        payment.bankCode = vnp_Params['vnp_BankCode'];
        payment.transactionId = vnp_Params['vnp_TransactionNo'];
        await payment.save();

        const booking = await Booking.findByIdAndUpdate(payment.bookingId, { 
            status: 'confirmed', updatedAt: new Date() 
        });

        // Cập nhật ghế trong Trip
        if (booking) {
            const tripUpdate: any = {};
            booking.seatCodes.forEach((code: string) => {
                tripUpdate[`seatsStatus.${code}.status`] = 'booked';
                tripUpdate[`seatsStatus.${code}.bookingId`] = booking._id;
            });
            await Trip.findByIdAndUpdate(booking.tripId, { $set: tripUpdate });
        }
        
        return NextResponse.json({ RspCode: '00', Message: 'Success' });
      } else {
        // --- Thất bại ---
        payment.status = 'failed';
        await payment.save();
        await Booking.findByIdAndUpdate(payment.bookingId, { status: 'cancelled' });
        return NextResponse.json({ RspCode: '00', Message: 'Success' });
      }
    } else {
      return NextResponse.json({ RspCode: '97', Message: 'Fail checksum' });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ RspCode: '99', Message: 'Unknow error' });
  }
}