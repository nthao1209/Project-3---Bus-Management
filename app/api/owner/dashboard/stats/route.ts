import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { getCurrentUser } from '@/lib/auth';
import { Company, Booking, Trip } from '@/models/models';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Lấy companyId từ query params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    let company;

    if (companyId) {
      // Lấy công ty cụ thể nếu có companyId
      company = await Company.findOne({ 
        _id: companyId, 
        ownerId: session.userId 
      });
    } else {
      // Lấy tất cả công ty của user
      const companies = await Company.find({ ownerId: session.userId });
      
      // Nếu có nhiều công ty, trả về để chọn
      if (companies.length > 1) {
        return NextResponse.json({
          success: true,
          data: {
            companies,
            needsSelection: true,
            message: 'Vui lòng chọn công ty để xem thống kê'
          }
        });
      }
      
      // Nếu chỉ có 1 công ty, tự động chọn
      company = companies[0];
    }

    if (!company) {
      return NextResponse.json({ 
        success: false, 
        message: 'Không tìm thấy công ty' 
      }, { status: 404 });
    }

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const trips = await Trip.find({ 
      companyId: company._id,
      departureTime: { $gte: last30Days }
    }).select('_id');

    const tripIds = trips.map(t => t._id);

    const confirmedBookings = await Booking.find({
      tripId: { $in: tripIds },
      status: 'confirmed'
    }).populate({
      path: 'tripId',
      populate: { path: 'routeId', select: 'name' }
    });

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalTickets = confirmedBookings.length;

    // Tổng số chuyến
    const totalTrips = await Trip.countDocuments({ 
      companyId: company._id 
    });

    // Doanh thu theo ngày (7 ngày gần nhất)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const dailyBookings = confirmedBookings.filter(b => {
        const createdAt = new Date(b.createdAt!);
        return createdAt >= startOfDay && createdAt <= endOfDay;
      });

      const dailyRevenue = dailyBookings.reduce((sum, b) => sum + b.totalPrice, 0);

      chartData.push({
        date: `${startOfDay.getDate()}/${startOfDay.getMonth() + 1}`,
        value: dailyRevenue
      });
    }

    // Lấy 10 bookings mới nhất
    const recentBookings = await Booking.find({
      tripId: { $in: tripIds }
    })
      .populate({
        path: 'tripId',
        populate: { path: 'routeId', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        company: {
          _id: company._id,
          name: company.name,
          hotline: company.hotline,
          status: company.status
        },
        totalRevenue,
        totalTickets,
        totalTrips,
        chartData,
        recentBookings,
        needsSelection: false
      }
    });

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message 
    }, { status: 500 });
  }
}