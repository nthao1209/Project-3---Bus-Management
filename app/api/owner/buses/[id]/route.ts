import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Bus, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// Định nghĩa type cho Next.js 15
type RouteParams = {
  params: Promise<{ id: string }>;
};

// 1. GET: Xem chi tiết 1 xe (Bổ sung thêm cho đầy đủ)
export async function GET(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; // Await params
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const bus = await Bus.findById(id);
    if (!bus) return NextResponse.json({ message: 'Không tìm thấy xe' }, { status: 404 });

    // Check quyền sở hữu
    const company = await Company.findOne({ _id: bus.companyId, ownerId: session.userId });
    if (!company) return NextResponse.json({ message: 'Không có quyền truy cập xe này' }, { status: 403 });

    return NextResponse.json({ success: true, data: bus });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

// 2. PUT: Sửa xe
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; // Await params
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();

    // Tìm xe
    const bus = await Bus.findById(id);
    if (!bus) return NextResponse.json({ message: 'Không tìm thấy xe' }, { status: 404 });

    // Kiểm tra quyền: User có phải chủ của Công ty sở hữu xe này không?
    const isOwner = await Company.exists({ _id: bus.companyId, ownerId: session.userId });
    
    if (!isOwner) {
      return NextResponse.json({ message: 'Bạn không có quyền sửa xe này' }, { status: 403 });
    }

    // Cập nhật
    // Lưu ý: Không cho phép update companyId một cách tuỳ tiện để tránh chuyển xe sang cty khác
    const updatedBus = await Bus.findByIdAndUpdate(id, body, { new: true });

    return NextResponse.json({ success: true, data: updatedBus });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi cập nhật xe', error: error.message }, { status: 500 });
  }
}

// 3. DELETE: Xóa xe
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; // Await params
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const bus = await Bus.findById(id);
    if (!bus) return NextResponse.json({ message: 'Không tìm thấy xe' }, { status: 404 });

    // Kiểm tra quyền
    const isOwner = await Company.exists({ _id: bus.companyId, ownerId: session.userId });
    
    if (!isOwner) {
      return NextResponse.json({ message: 'Bạn không có quyền xóa xe này' }, { status: 403 });
    }

    await bus.deleteOne();
    return NextResponse.json({ success: true, message: 'Đã xóa xe' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa xe', error: error.message }, { status: 500 });
  }
}