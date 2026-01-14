import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking, Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getCurrentUser();
    if (!session || session.role !== 'driver') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const isMyTrip = await Trip.exists({ _id: id, driverId: session.userId });
    if (!isMyTrip) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const trip = await Trip.findOne({
        _id: id,
        driverId: session.userId
      }).select('status');

      if (!trip) return NextResponse.json({ message: 'Trip not found' }, { status: 404 });

      const bookingStatus =
        trip.status === 'completed'
          ? { $in: ['confirmed', 'boarded'] }
          : { $in: ['pending_payment', 'confirmed', 'boarded'] };

      const bookings = await Booking.find({
        tripId: id,
        status: bookingStatus
      })
      .select('seatCodes customerInfo totalPrice status pickupPoint dropoffPoint note paymentExpireAt')
      .sort({ 'seatCodes.0': 1 })
      .lean();

    return NextResponse.json({ success: true, data: bookings });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}