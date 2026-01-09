import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { getCurrentUser } from '@/lib/auth';
import { Booking, Payment, Trip } from '@/models/models';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    
    if (!session || !['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'confirmed') {
      return NextResponse.json({ message: 'Booking already confirmed' }, { status: 400 });
    }

    // Cập nhật booking
    booking.status = 'confirmed';
    await booking.save();

    // Cập nhật payment
    await Payment.findOneAndUpdate(
      { bookingId: booking._id },
      { 
        status: 'success',
        paymentDate: new Date()
      }
    );

    // Cập nhật trip seats
    const tripUpdate: any = {};
    booking.seatCodes.forEach((code: string) => {
      tripUpdate[`seatsStatus.${code}.status`] = 'booked';
      tripUpdate[`seatsStatus.${code}.bookingId`] = booking._id;
    });
    await Trip.findByIdAndUpdate(booking.tripId, { $set: tripUpdate });

    // Emit socket event
    try {
      const io = (global as any).io;
      if (io) {
        const trip = await Trip.findById(booking.tripId).select('companyId');
        if (trip && trip.companyId) {
          io.to(`company_${trip.companyId}`).emit('booking_confirmed', {
            bookingId: booking._id,
            amount: booking.totalPrice,
            timestamp: new Date()
          });
        }
      }
    } catch (socketError) {
      console.error('Socket emit error:', socketError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: booking
    });

  } catch (error: any) {
    console.error('Confirm payment error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}
