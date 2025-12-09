import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User, Company, Booking, Trip } from '@/models/models';

export async function GET() {
  try {
    await dbConnect();
    
    // Đếm song song để tối ưu tốc độ
    const [userCount, companyCount, tripCount, bookings] = await Promise.all([
      User.countDocuments(),
      Company.countDocuments(),
      Trip.countDocuments(),
      Booking.find({ status: 'confirmed' }).select('totalPrice')
    ]);

    // Tính tổng doanh thu từ các vé đã confirmed
    const totalRevenue = bookings.reduce((acc, curr) => acc + curr.totalPrice, 0);

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalUsers: userCount,
        totalCompanies: companyCount,
        totalTrips: tripCount
      }
    });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 });
  }
}