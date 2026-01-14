import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// Định nghĩa params khớp với tên thư mục: [id] và [bookingId]
type RouteParams = {
  params: Promise<{ id: string; bookingId: string }>;
};

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    
    // LẤY ĐÚNG ID TỪ PARAMS
    const { id, bookingId } = await params;
    // 'id' là TripID (do thư mục tên là [id])
    // 'bookingId' là BookingID (do thư mục tên là [bookingId])

    if (!session || session.role !== 'driver') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await req.json();

    // 1. Tìm Booking theo đúng bookingId
    const booking = await Booking.findById(bookingId).populate('tripId');

    if (!booking) {
      return NextResponse.json({ message: 'Không tìm thấy vé' }, { status: 404 });
    }

    // 2. Kiểm tra vé có thuộc đúng chuyến xe trên URL không
    if (booking.tripId._id.toString() !== id) {
      return NextResponse.json({ message: 'Vé không thuộc chuyến xe này' }, { status: 400 });
    }

    // 3. Cập nhật trạng thái
    booking.status = status;
    await booking.save();

    // 4. Socket Realtime (Gửi vào room id của Trip)
    try {
        const io = (global as any).io;
        if (io) {
            // Gửi vào room tên là "id" (TripID) như bạn yêu cầu
            io.to(id).emit('booking_updated', { 
                bookingId: booking._id,
                status: status,
                seatCodes: booking.seatCodes
            });
        }
    } catch (e) {
        console.error("Socket error", e);
    }

    return NextResponse.json({ success: true, message: 'Cập nhật thành công' });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}