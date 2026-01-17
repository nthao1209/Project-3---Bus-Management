import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import crypto from 'crypto';
import { sortObject, vnpayConfig } from '@/lib/vnpay';
import { dbConnect } from '@/lib/dbConnect';
import { Payment } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // 1. Config & Auth
    if (!vnpayConfig.tmnCode || !vnpayConfig.hashSecret) {
       throw new Error("Thiếu cấu hình VNPAY");
    }
    const session = await getCurrentUser();
    const body = await req.json();
    const { bookingId, amount, bankCode, language } = body;

    if (!bookingId || !amount) throw new Error("Thiếu data");

    await dbConnect();
    
    // 2. Tạo/Lấy Payment
    let payment = await Payment.findOne({ bookingId, status: 'pending' });
    if (!payment) {
        payment = await Payment.create({
            bookingId,
            userId: session?.userId,
            amount,
            method: 'vnpay',
            status: 'pending',
            // Thêm expiration time: VNPay link hết hạn sau 15 phút
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
    } else {
        // Cập nhật expiration time nếu user tạo lại link
        payment.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await payment.save();
    }

    // 3. Chuẩn bị tham số VNPAY
    const date = new Date();
    const createDate = dayjs(date).format('YYYYMMDDHHmmss');

    // Reuse existing transactionId if payment already has one (generated at booking time)
    let orderId = payment.transactionId;
    if (!orderId) {
      orderId = dayjs(date).format('DDHHmmss');
      payment.transactionId = orderId;
      await payment.save();
    }

    // Xử lý IP
    let ipAddr = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (ipAddr && typeof ipAddr === 'string') ipAddr = ipAddr.split(',')[0].trim();
    if (ipAddr === '::1') ipAddr = '127.0.0.1';

    // Tạo object params (Chưa encode)
    let vnp_Params: any = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = vnpayConfig.tmnCode;
    vnp_Params['vnp_Locale'] = language || 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = orderId;
    vnp_Params['vnp_OrderInfo'] = `Thanh toan ve ${bookingId}`;
    vnp_Params['vnp_OrderType'] = 'billpayment';
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = vnpayConfig.returnUrl;
    vnp_Params['vnp_IpAddr'] = ipAddr;
    vnp_Params['vnp_CreateDate'] = createDate;
    if (bankCode) vnp_Params['vnp_BankCode'] = bankCode;

    // --- QUAN TRỌNG: SẮP XẾP VÀ TẠO CHỮ KÝ ---
    
    // B1. Sắp xếp object theo key
    vnp_Params = sortObject(vnp_Params);

    // B2. Tạo chuỗi cần ký (signData) bằng cách Encode thủ công
    // Quy tắc: key=value&key=value... (Value phải được encodeURI và đổi khoảng trắng thành +)
    const signData = Object.keys(vnp_Params)
      .map(key => {
        return `${key}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+")}`;
      })
      .join('&');

    console.log("Chuỗi ký (Đã Encode):", signData); 

    // B3. Tạo mã Hash (HMAC-SHA512)
    const hmac = crypto.createHmac("sha512", vnpayConfig.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
    
    // B4. Gán chữ ký vào params
    vnp_Params['vnp_SecureHash'] = signed;
    
    // B5. Tạo URL cuối cùng (Lúc này mới dùng URLSearchParams hoặc loop để nối chuỗi)
    // Lưu ý: URLSearchParams sẽ tự động encode lại lần nữa, nên ta cần truyền params gốc vào
    const finalUrl = vnpayConfig.url + "?" + Object.keys(vnp_Params)
      .map(key => `${key}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+")}`)
      .join('&');

    console.log("Final URL:", finalUrl);

    return NextResponse.json({ success: true, url: finalUrl });

  } catch (error: any) {
    console.error("VNPAY Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
