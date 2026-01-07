import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking, Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();

    // 1. Tìm Booking
    const booking = await Booking.findOne({ _id: bookingId, userId: session.userId });
    if (!booking) {
      return NextResponse.json({ message: 'Không tìm thấy vé' }, { status: 404 });
    }

    // 2. Kiểm tra điều kiện hủy
    if (['cancelled', 'boarded'].includes(booking.status)) {
      return NextResponse.json({ message: 'Vé này không thể hủy' }, { status: 400 });
    }

    const trip = await Trip.findById(booking.tripId);
    const now = new Date();
    if (trip.departureTime.getTime() - now.getTime() < 1 * 60 * 60 * 1000) {
      return NextResponse.json({ message: 'Không thể hủy vé trước 1 giờ đi' }, { status: 400 });
    }

    // 3. Cập nhật trạng thái Booking
    booking.status = 'cancelled';
    await booking.save();

    // 4. NHẢ GHẾ TRONG TRIP (Quan trọng)
    const setUpdates: any = {};
    const unsetUpdates: any = {};

    booking.seatCodes.forEach((code: string) => {
      setUpdates[`seatsStatus.${code}.status`] = 'available';
      unsetUpdates[`seatsStatus.${code}.bookingId`] = '';
      unsetUpdates[`seatsStatus.${code}.socketId`] = '';
      unsetUpdates[`seatsStatus.${code}.holdExpireAt`] = '';
    });

    await Trip.updateOne(
      { _id: booking.tripId },
      {
        $set: setUpdates,
        $unset: unsetUpdates
      }
);

    return NextResponse.json({ success: true, message: 'Hủy vé thành công' });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}