import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Company, Route, Bus } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// 1. GET: Lấy tất cả chuyến đi của Owner
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // Lấy danh sách ID các công ty của User này
    const companies = await Company.find({ ownerId: session.userId }).select('_id');
    const companyIds = companies.map(c => c._id);

    // Lấy tham số query (ví dụ ?date=2024-12-05)
    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date');

    let filter: any = { companyId: { $in: companyIds } };

    // Nếu có lọc theo ngày
    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);
      filter.departureTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const trips = await Trip.find(filter)
      .populate('busId', 'plateNumber type')    // Lấy biển số xe
      .populate('routeId', 'name')              // Lấy tên tuyến
      .populate('driverId', 'name phone')       // Lấy tên tài xế
      .sort({ departureTime: 1 });              // Sắp xếp tăng dần theo giờ chạy

    return NextResponse.json({ success: true, data: trips });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

// 2. POST: Thêm chuyến đi mới
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    const { companyId, routeId, busId, departureTime, arrivalTime, basePrice } = body;

    // 1. Kiểm tra quyền sở hữu Company
    const company = await Company.findOne({ _id: companyId, ownerId: session.userId });
    if (!company) return NextResponse.json({ message: 'Nhà xe không hợp lệ' }, { status: 403 });

    // 2. (Tuỳ chọn) Kiểm tra xem Route và Bus có thuộc Company này không
    // Để đảm bảo dữ liệu toàn vẹn
    const validBus = await Bus.findOne({ _id: busId, companyId });
    const validRoute = await Route.findOne({ _id: routeId, companyId });
    
    if (!validBus || !validRoute) {
       return NextResponse.json({ message: 'Xe hoặc Tuyến đường không thuộc nhà xe này' }, { status: 400 });
    }

    const newTrip = await Trip.create({
        ...body,
        status: 'scheduled' // Mặc định là 'Đã lên lịch'
    });

    return NextResponse.json({ success: true, data: newTrip }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi tạo chuyến đi', error: error.message }, { status: 500 });
  }
}