import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking, Payment, Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session || session.role !== 'driver') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();

    const booking = await Booking.findById(bookingId);
    if (!booking) return NextResponse.json({ message: 'Booking not found' }, { status: 404 });

    // 1. Update Booking
    booking.status = 'confirmed';
    await booking.save();

    // 2. Update Payment
    await Payment.findOneAndUpdate(
      { bookingId: booking._id },
      { status: 'success', method: 'offline', paymentDate: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Update Trip Seats (Chuyển holding -> booked)
    const tripUpdate: any = {};
    booking.seatCodes.forEach((code: string) => {
      tripUpdate[`seatsStatus.${code}.status`] = 'booked';
      tripUpdate[`seatsStatus.${code}.bookingId`] = booking._id;
    });
    await Trip.findByIdAndUpdate(booking.tripId, { $set: tripUpdate });

    // --- QUAN TRỌNG: Gửi Socket Realtime ---
    try {
        const io = (global as any).io;
        if (io) {
            const tripId = booking.tripId.toString();
            console.log(`📡 Emitting payment confirmed for trip ${tripId}`);

            io.to(`${tripId}`).emit('booking_updated', { 
                bookingId: booking._id,
                status: 'confirmed',
                seatCodes: booking.seatCodes
            });
        }
    } catch (e) {
        console.error("Socket emit error:", e);
    }
    // ----------------------------------------

    return NextResponse.json({ success: true, message: 'Đã xác nhận thu tiền' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}