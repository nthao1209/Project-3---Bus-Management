import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    
    const { id } = await params;

    if (!session || session.role !== 'driver') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const trip = await Trip.findOne({ _id: id, driverId: session.userId })
      .populate('routeId', 'name') 
      .populate('busId', 'plateNumber') 
      .select('departureTime status routeId busId seatsStatus'); 

    if (!trip) {
      return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: trip });
  } catch (error: any) {
    console.error('Get trip detail error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}