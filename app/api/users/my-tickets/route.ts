// app/api/users/my-tickets/route.ts
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const bookings = await Booking.find({ userId: session.userId })
      .populate({
        path: 'tripId',
        populate: [
          { path: 'routeId', select: 'name' },
          { path: 'busId', select: 'plateNumber type' }
        ]
      })
      .sort({ createdAt: -1 }); // Mới nhất lên đầu

    return NextResponse.json({ success: true, data: bookings });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}