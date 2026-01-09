import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Payment, Booking, Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

/**
 * API để user check lại trạng thái payment khi bị mất mạng sau khi thanh toán
 * 
 * Case: User đã thanh toán VNPay, nhập xong OTP, nhưng mất mạng trước khi IPN/Return URL xử lý
 * -> Payment vẫn pending nhưng có thể VNPay đã trừ tiền
 * 
 * Endpoint này sẽ:
 * 1. Tìm payment của booking
 * 2. Nếu payment đã success -> cập nhật booking
 * 3. Trả về trạng thái hiện tại
 */
export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing bookingId' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Tìm booking và payment
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền (chỉ owner của booking hoặc admin)
    if (booking.userId?.toString() !== session.userId && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const payment = await Payment.findOne({ bookingId });
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // ✅ CASE 1: Payment đã success nhưng booking chưa confirmed (do IPN xử lý xong mà user mất mạng)
    if (payment.status === 'success' && booking.status !== 'confirmed') {
      console.log(`🔧 Syncing booking ${bookingId} - Payment is success but booking is ${booking.status}`);
      
      // Update booking
      booking.status = 'confirmed';
      booking.updatedAt = new Date();
      await booking.save();

      // Update seats
      const tripUpdate: any = {};
      booking.seatCodes.forEach((code: string) => {
        tripUpdate[`seatsStatus.${code}.status`] = 'booked';
        tripUpdate[`seatsStatus.${code}.bookingId`] = booking._id;
      });
      
      await Trip.findByIdAndUpdate(booking.tripId, { $set: tripUpdate });

      // Emit Socket.IO event
      try {
        const io = (global as any).io;
        if (io) {
          const trip = await Trip.findById(booking.tripId).select('companyId');
          if (trip?.companyId) {
            io.to(`company_${trip.companyId}`).emit('booking_updated', {
              bookingId: booking._id,
              status: 'confirmed'
            });
          }
        }
      } catch (socketError) {
        console.error('Socket emit error:', socketError);
      }

      return NextResponse.json({
        success: true,
        message: 'Thanh toán đã được xác nhận!',
        payment: {
          status: payment.status,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          transactionId: payment.transactionId
        },
        booking: {
          status: booking.status,
          updatedAt: booking.updatedAt
        }
      });
    }

    // ✅ CASE 2: Payment vẫn pending - cần user liên hệ support hoặc đợi IPN
    if (payment.status === 'pending') {
      // Kiểm tra expiration
      const isExpired = payment.expiresAt && new Date() > payment.expiresAt;
      
      return NextResponse.json({
        success: false,
        payment: {
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt,
          expiresAt: payment.expiresAt,
          isExpired
        },
        booking: {
          status: booking.status
        },
        message: isExpired 
          ? 'Link thanh toán đã hết hạn. Vui lòng đặt vé lại hoặc liên hệ hỗ trợ nếu đã thanh toán.'
          : 'Thanh toán đang chờ xác nhận từ VNPay. Nếu bạn đã thanh toán, vui lòng đợi ít phút hoặc liên hệ hỗ trợ.'
      });
    }

    // ✅ CASE 3: Payment failed
    if (payment.status === 'failed') {
      return NextResponse.json({
        success: false,
        payment: {
          status: payment.status,
          amount: payment.amount,
          transactionId: payment.transactionId
        },
        booking: {
          status: booking.status
        },
        message: 'Thanh toán thất bại. Vui lòng thử lại.'
      });
    }

    // Default response
    return NextResponse.json({
      success: true,
      payment: {
        status: payment.status,
        amount: payment.amount,
        paymentDate: payment.paymentDate
      },
      booking: {
        status: booking.status
      }
    });

  } catch (error) {
    console.error('❌ Check payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
