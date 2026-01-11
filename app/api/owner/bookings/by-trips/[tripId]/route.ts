
import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking, Trip, Company } from '@/models/models'; 
import { getCurrentUser } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ tripId: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { tripId } = await params;

    const session = await getCurrentUser();
    if (!session || !['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const trip = await Trip.findById(tripId).lean();
    
    if (!trip) {
      return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
    }

    if (session.role === 'owner') {
      const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
      if (!isOwner) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    const bookings = await Booking.find({ tripId: tripId })
      .sort({ createdAt: -1 }) 
      .lean();

    
    const totalSeats = trip.seatsStatus ? Object.keys(trip.seatsStatus).length : 40;

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookings,
        totalSeats: totalSeats
      }
    });

  } catch (error: any) {
    console.error('Get bookings by trip error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
}