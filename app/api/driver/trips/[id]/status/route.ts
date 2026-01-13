import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    const { id } = await params;

    if (!session || session.role !== 'driver') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await req.json(); 

    const trip = await Trip.findOne({ _id: id, driverId: session.userId });
    if (!trip) return NextResponse.json({ message: 'Trip not found' }, { status: 404 });

    trip.status = status;
    await trip.save();

    // --- SOCKET REALTIME ---
    try {
        const io = (global as any).io;
        if (io) {
            // Báo cho room chuyến xe
            io.to(`trip_${trip._id}`).emit('trip_status_updated', { 
                tripId: trip._id, 
                status: status 
            });
            // Báo cho room công ty 
            io.to(`company_${trip.companyId}`).emit('trip_status_updated', {
                tripId: trip._id,
                status: status
            });
        }
    } catch (e) {
        console.error("Socket emit error", e);
    }

    return NextResponse.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}