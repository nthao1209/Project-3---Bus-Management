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

    // Verify trip belongs to driver
    const isMyTrip = await Trip.exists({ _id: id, driverId: session.userId });
    if (!isMyTrip) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const bookings = await Booking.find({ 
      tripId: id,
      status: { $in: ['pending_payment', 'confirmed', 'boarded'] }
    })
    .select('seatCodes customerInfo totalPrice status pickupPoint dropoffPoint note paymentExpireAt')
    .sort({ 'seatCodes.0': 1 }) // Sắp xếp theo số ghế
    .lean();

    return NextResponse.json({ success: true, data: bookings });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}