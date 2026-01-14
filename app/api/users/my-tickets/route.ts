import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking, Review } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    // 1. Lấy danh sách Booking
    const bookings = await Booking.find({ userId: session.userId })
      .populate({
        path: 'tripId',
        select: 'routeId busId departureTime status', // Lấy thêm status của trip
        populate: [
          { path: 'routeId', select: 'name' },
          { path: 'busId', select: 'plateNumber type' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean(); // Dùng lean() để trả về plain object, dễ chỉnh sửa

    // 2. Kiểm tra trạng thái đánh giá cho từng vé
    const data = await Promise.all(bookings.map(async (booking: any) => {
        const review = await Review.findOne({ 
            userId: session.userId, 
            tripId: booking.tripId._id 
        }).select('_id rating comment');

        return {
            ...booking,
            isReviewed: !!review, 
            reviewDetail: review || null 
        };
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}