import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Route, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// GET: Lấy danh sách tuyến đường của nhà xe
export async function GET() {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // 1. Tìm Company của Owner này
    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) return NextResponse.json({ success: true, data: [] });

    // 2. Tìm Routes thuộc Company đó
    const routes = await Route.find({ companyId: company._id })
      .populate('startStationId', 'name province')
      .populate('endStationId', 'name province')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: routes });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      startStationId,
      endStationId,
      distanceKm,
      durationMinutes,
      defaultPickupPoints = [],
      defaultDropoffPoints = []
    } = body;

    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) {
      return NextResponse.json({ message: 'Bạn chưa đăng ký nhà xe' }, { status: 403 });
    }

    const newRoute = await Route.create({
      companyId: company._id,
      name,
      startStationId,
      endStationId,
      distanceKm,
      durationMinutes,
      defaultPickupPoints,
      defaultDropoffPoints
    });

    return NextResponse.json({ success: true, data: newRoute }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi tạo tuyến', error: error.message },
      { status: 500 }
    );
  }
}
