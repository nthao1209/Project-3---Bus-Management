import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Bus, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // Bước 1: Lấy danh sách các Công ty mà user này sở hữu
    const companies = await Company.find({ ownerId: session.userId }).select('_id');
    const companyIds = companies.map(c => c._id);

    // Bước 2: Tìm tất cả xe thuộc các công ty đó
    const buses = await Bus.find({ companyId: { $in: companyIds } })
      .populate('companyId', 'name') // (Tuỳ chọn) Lấy thêm tên nhà xe để hiển thị
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: buses });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUserId();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    const { companyId, plateNumber, type, seatLayout, amenities, status } = body;

    // Validate: Kiểm tra xem user có phải chủ sở hữu của companyId này không
    const company = await Company.findOne({ _id: companyId, ownerId: session.userId });
    
    if (!company) {
      return NextResponse.json({ message: 'Nhà xe không tồn tại hoặc bạn không có quyền' }, { status: 403 });
    }

    const newBus = await Bus.create({ 
      companyId, 
      plateNumber, 
      type, 
      seatLayout, 
      amenities, 
      status 
    });

    return NextResponse.json({ success: true, data: newBus }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi tạo xe', error: error.message }, { status: 500 });
  }
}