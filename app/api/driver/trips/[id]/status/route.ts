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

    // Enforce: driver can only mark trip as completed when current time
    // is at least departureTime + 30 minutes
    if (status === 'completed') {
      const departure = trip.departureTime;
      const now = new Date();
      const allowedAt = new Date(departure.getTime() + 30 * 60 * 1000);
      if (now < allowedAt) {
        return NextResponse.json({
          message: 'Không thể hoàn thành trước thời gian xuất phát +30 phút',
          allowedAt: allowedAt.toISOString()
        }, { status: 400 });
      }
    }

    trip.status = status;
    await trip.save();

    // --- SOCKET REALTIME ---
    try {
        const io = (global as any).io;
        if (io) {
            // Báo cho room chuyến xe
            io.to(`${trip._id}`).emit('trip_status_updated', { 
                tripId: trip._id, 
                status: status 
            });
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
