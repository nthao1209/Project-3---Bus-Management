import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Payment, Booking, Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

/**
 * ADMIN ONLY: API để kiểm tra và sửa các trạng thái payment không nhất quán
 * 
 * Các trường hợp xử lý:
 * 1. Payment success nhưng Booking vẫn pending_payment
 * 2. Payment pending nhưng đã hết hạn (> 15 phút)
 * 3. Booking confirmed nhưng ghế chưa được đánh dấu booked
 */
export async function POST(req: Request) {
  try {
    const session = await getCurrentUser();
    
    // Chỉ admin mới được chạy reconciliation
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await dbConnect();
    
    const results = {
      successPaymentsFixed: 0,
      expiredPaymentsCancelled: 0,  
      seatsFixed: 0,
      errors: [] as string[]
    };

    // 1. TÌM PAYMENT SUCCESS NHƯNG BOOKING CHƯA CONFIRMED
    const successPayments = await Payment.find({ status: 'success' })
      .populate('bookingId');
    
    for (const payment of successPayments) {
      try {
        const booking = payment.bookingId as any;
        if (!booking) {
          results.errors.push(`Payment ${payment._id} has no booking`);
          continue;
        }

        if (booking.status !== 'confirmed') {
          console.log(`🔧 Fixing booking ${booking._id} - Payment is success but booking is ${booking.status}`);
          
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
          
          results.successPaymentsFixed++;
        }
      } catch (error: any) {
        results.errors.push(`Error fixing payment ${payment._id}: ${error.message}`);
      }
    }

    // 2. TÌM PAYMENT PENDING QUÁ HẠN (> 15 PHÚT)
    const expiredDate = new Date(Date.now() - 15 * 60 * 1000);
    const expiredPayments = await Payment.find({
      status: 'pending',
      createdAt: { $lt: expiredDate }
    });

    for (const payment of expiredPayments) {
      try {
        console.log(`🔧 Cancelling expired payment ${payment._id}`);
        payment.status = 'failed';
        await payment.save();

        // Cancel booking nếu vẫn pending_payment
        const booking = await Booking.findById(payment.bookingId);
        if (booking && booking.status === 'pending_payment') {
          booking.status = 'cancelled';
          await booking.save();

          // Release seats
          const tripUpdate: any = {};
          booking.seatCodes.forEach((code: string) => {
            tripUpdate[`seatsStatus.${code}.status`] = 'available';
            tripUpdate[`seatsStatus.${code}.bookingId`] = null;
          });
          await Trip.findByIdAndUpdate(booking.tripId, { $set: tripUpdate });
        }

        results.expiredPaymentsCancelled++;
      } catch (error: any) {
        results.errors.push(`Error cancelling expired payment ${payment._id}: ${error.message}`);
      }
    }

    // 3. TÌM BOOKING CONFIRMED NHƯNG GHẾ CHƯA ĐƯỢC ĐÁNH DẤU
    const confirmedBookings = await Booking.find({ status: 'confirmed' });
    
    for (const booking of confirmedBookings) {
      try {
        const trip = await Trip.findById(booking.tripId);
        if (!trip) continue;

        let needsUpdate = false;
        const tripUpdate: any = {};

        for (const seatCode of booking.seatCodes) {
          const seat = trip.seatsStatus.get(seatCode);
          if (!seat || seat.status !== 'booked' || seat.bookingId?.toString() !== booking._id.toString()) {
            console.log(`🔧 Fixing seat ${seatCode} in trip ${trip._id}`);
            tripUpdate[`seatsStatus.${seatCode}.status`] = 'booked';
            tripUpdate[`seatsStatus.${seatCode}.bookingId`] = booking._id;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await Trip.findByIdAndUpdate(trip._id, { $set: tripUpdate });
          results.seatsFixed++;
        }
      } catch (error: any) {
        results.errors.push(`Error fixing seats for booking ${booking._id}: ${error.message}`);
      }
    }

    console.log('✅ Reconciliation completed:', results);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ Reconciliation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
