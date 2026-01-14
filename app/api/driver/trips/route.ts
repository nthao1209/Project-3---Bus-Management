import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();

    if (!session || session.role !== 'driver') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const trips = await Trip.find({
      driverId: session.userId,
      departureTime: { $gte: yesterday },
      status: { $in: ['scheduled', 'running'] } 
    })
    .populate('routeId', 'name startStationId endStationId')
    .populate('busId', 'plateNumber type')
    .sort({ departureTime: 1 }) 
    .lean();

    return NextResponse.json({ success: true, data: trips });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}