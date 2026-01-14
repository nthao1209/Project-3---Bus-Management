import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Review, Booking, Trip } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { tripId, rating, comment } = await req.json();

    if (!tripId || !rating) {
      return NextResponse.json({ message: 'Thiếu thông tin đánh giá' }, { status: 400 });
    }

    // 1. Lấy thông tin Trip để kiểm tra trạng thái
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return NextResponse.json({ message: 'Chuyến đi không tồn tại' }, { status: 404 });
    }

    // --- SỬA LOGIC TẠI ĐÂY ---
    // Chỉ cho phép đánh giá khi Chuyến đi đã HOÀN THÀNH
    if (trip.status !== 'completed') {
      return NextResponse.json(
        { message: 'Chuyến đi chưa kết thúc, bạn chưa thể đánh giá lúc này.' },
        { status: 403 }
      );
    }

    // 2. Kiểm tra xem User có vé hợp lệ của chuyến này không
    // Vé phải là 'confirmed' (đã mua) hoặc 'boarded' (đã lên xe), hoặc 'completed'
    // Không được là 'cancelled' hoặc 'pending_payment'
    const booking = await Booking.findOne({
      userId: user.userId,
      tripId,
      status: { $in: ['confirmed', 'boarded', 'completed'] }, 
    });

    if (!booking) {
      return NextResponse.json(
        { message: 'Bạn không có vé hợp lệ cho chuyến đi này.' },
        { status: 403 }
      );
    }

    // 3. Tạo Review
    await Review.create({
      userId: user.userId,
      tripId,
      companyId: trip.companyId,
      rating,
      comment,
    });

    return NextResponse.json(
      { success: true, message: 'Đánh giá thành công' },
      { status: 201 }
    );

  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { message: 'Bạn đã đánh giá chuyến đi này rồi' },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: 'Lỗi hệ thống', error: err.message }, { status: 500 });
  }
}