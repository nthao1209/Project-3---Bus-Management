import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { TripTemplate, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// 1. GET: Lấy danh sách mẫu lịch trình (ĐỂ SỬA LỖI 405)
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // Tìm công ty của owner
    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) return NextResponse.json({ success: true, data: [] });

    // Lấy danh sách template
    const templates = await TripTemplate.find({ 
      companyId: company._id,
      active: true 
    })
    .populate('routeId','name')
    .populate('busId','plateNumber type')
    .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

// 2. POST: Tạo mẫu lịch trình mới (Code cũ)
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // Destructuring dữ liệu
    const { 
        routeId, busId, driverId, 
        departureTimeStr, durationMinutes, 
        daysOfWeek, basePrice 
    } = body;

    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) return NextResponse.json({ message: 'Chưa có nhà xe' }, { status: 403 });

    const template = await TripTemplate.create({
      companyId: company._id,
      routeId,
      busId,
      driverId,
      departureTimeStr, 
      durationMinutes,
      daysOfWeek, 
      basePrice,
      active: true
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}