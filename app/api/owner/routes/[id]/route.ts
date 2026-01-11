import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Route, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

const formatPoints = (points: any[]) => {
  if (!Array.isArray(points)) return [];
  return points.map((p) => ({
    name: p.name,
    address: p.address,
    timeOffset: Number(p.timeOffset) || 0,
  }));
};
// PUT: Cập nhật tuyến đường
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();

    // 1. Tìm tuyến đường
    const route = await Route.findById(id);
    if (!route) return NextResponse.json({ message: 'Không tìm thấy tuyến' }, { status: 404 });

    // 2. Check quyền sở hữu (Route phải thuộc Company của Owner)
    const isOwner = await Company.exists({ _id: route.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền sửa' }, { status: 403 });

    // 3. Update

    const updateData = { ...body };
    if(updateData.defaultPickupPoints) {
      updateData.defaultPickupPoints = formatPoints(updateData.defaultPickupPoints);
    }
    
    if(updateData.defaultDropoffPoints) {
      updateData.defaultDropoffPoints = formatPoints(updateData.defaultDropoffPoints);
    }

    const updatedRoute = await Route.findByIdAndUpdate(id, updateData, { new: true });

    return NextResponse.json({ success: true, data: updatedRoute });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi cập nhật', error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa tuyến đường
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const route = await Route.findById(id);
    if (!route) return NextResponse.json({ message: 'Không tìm thấy tuyến' }, { status: 404 });

    // Check quyền
    const isOwner = await Company.exists({ _id: route.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền xóa' }, { status: 403 });

    await route.deleteOne();
    return NextResponse.json({ success: true, message: 'Đã xóa tuyến đường' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa', error: error.message }, { status: 500 });
  }
}