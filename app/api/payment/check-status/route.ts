import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Payment } from '@/models/models';

/**
 * API endpoint để kiểm tra trạng thái thanh toán
 * Dùng cho return page polling để giải quyết race condition với IPN
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const txnRef = searchParams.get('txnRef');

    if (!txnRef) {
      return NextResponse.json(
        { error: 'Missing txnRef parameter' },
        { status: 400 }
      );
    }

    await dbConnect();
    const payment = await Payment.findOne({ transactionId: txnRef });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Kiểm tra expiration
    if (payment.expiresAt && new Date() > payment.expiresAt && payment.status === 'pending') {
      return NextResponse.json({
        status: 'expired',
        message: 'Payment link has expired'
      });
    }

    return NextResponse.json({
      status: payment.status,
      amount: payment.amount,
      method: payment.method,
      paymentDate: payment.paymentDate,
      bookingId: payment.bookingId
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
