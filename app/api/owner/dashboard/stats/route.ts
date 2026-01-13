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

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    
    // 1. Nhận tham số lọc thời gian
    const type = searchParams.get('type') || 'day'; // day | month | year
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    
    // Xử lý ngày được chọn (hoặc mặc định là hôm nay)
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    let company;
    if (companyId) {
      company = await Company.findOne({ _id: companyId, ownerId: session.userId });
    } else {
      const companies = await Company.find({ ownerId: session.userId });
      if (companies.length > 1) {
        return NextResponse.json({
          success: true,
          data: { companies, needsSelection: true, message: 'Vui lòng chọn công ty' }
        });
      }
      company = companies[0];
    }

    if (!company) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy công ty' }, { status: 404 });
    }
    // ----------------------------------------

    // 2. Tính toán khoảng thời gian Start/End dựa trên Type
    let startDate = new Date(selectedDate);
    let endDate = new Date(selectedDate);
    let chartData = [];

    if (type === 'day') {
      // Theo ngày: Từ 00:00 đến 23:59
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      // Chart data: 24 giờ
      for (let i = 0; i < 24; i += 2) { // Gom nhóm mỗi 2 giờ để đỡ rối
        chartData.push({ label: `${i}h-${i+2}h`, startHour: i, endHour: i+2, value: 0 });
      }

    } else if (type === 'month') {
      // Theo tháng: Từ ngày 1 đến ngày cuối tháng
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Ngày cuối tháng trước
      endDate.setHours(23, 59, 59, 999);

      // Chart data: Số ngày trong tháng
      const daysInMonth = endDate.getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        chartData.push({ label: `${i}/${startDate.getMonth() + 1}`, day: i, value: 0 });
      }

    } else if (type === 'year') {
      // Theo năm: Từ 1/1 đến 31/12
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate.setFullYear(endDate.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);

      // Chart data: 12 tháng
      for (let i = 0; i < 12; i++) {
        chartData.push({ label: `T${i + 1}`, month: i, value: 0 });
      }
    }

    // 3. Query Trip và Booking theo khoảng thời gian
    // Tìm chuyến đi có giờ khởi hành trong khoảng này
    const trips = await Trip.find({ 
      companyId: company._id,
      departureTime: { $gte: startDate, $lte: endDate }
    }).select('_id departureTime');

    const tripIds = trips.map(t => t._id);

    // Tìm các vé đã thanh toán thuộc các chuyến đi đó
    const confirmedBookings = await Booking.find({
      tripId: { $in: tripIds },
      status: 'confirmed'
    }).populate({
      path: 'tripId',
      select: 'departureTime', // Cần lấy departureTime để map vào biểu đồ
      populate: { path: 'routeId', select: 'name' }
    });

    // 4. Tính toán thống kê
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalTickets = confirmedBookings.length;
    const totalTrips = trips.length;

    // 5. Fill dữ liệu vào Chart
    confirmedBookings.forEach(booking => {
      // Dùng thời gian khởi hành của chuyến xe để thống kê doanh thu (hợp lý hơn ngày đặt vé)
      // Hoặc dùng booking.createdAt nếu muốn thống kê theo thời điểm bán vé
      const timePoint = new Date((booking.tripId as any).departureTime); 
      const price = booking.totalPrice;

      if (type === 'day') {
        const hour = timePoint.getHours();
        const slot = chartData.find(
          c =>
            c.startHour !== undefined &&
            c.endHour !== undefined &&
            hour >= c.startHour &&
            hour < c.endHour
        );

        if (slot) slot.value += price;
      } else if (type === 'month') {
        const day = timePoint.getDate();
        const slot = chartData.find(c => c.day === day);
        if (slot) slot.value += price;
      } else if (type === 'year') {
        const month = timePoint.getMonth();
        const slot = chartData.find(c => c.month === month);
        if (slot) slot.value += price;
      }
    });

    // 6. Lấy bookings mới nhất (Không phụ thuộc filter ngày, chỉ lấy mới nhất của cty)
    // Cần query lại tripIds không giới hạn ngày để lấy booking mới nhất toàn cục
    const allTrips = await Trip.find({ companyId: company._id }).select('_id');
    const allTripIds = allTrips.map(t => t._id);

    const recentBookings = await Booking.find({
      tripId: { $in: allTripIds }
    })
      .populate({
        path: 'tripId',
        populate: { path: 'routeId', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .limit(10);

    // Chuẩn hóa chartData để trả về frontend (chỉ cần date/label và value)
    const finalChartData = chartData.map(c => ({
      date: c.label,
      value: c.value
    }));

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
        chartData: finalChartData,
        recentBookings,
        needsSelection: false
      }
    });

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}