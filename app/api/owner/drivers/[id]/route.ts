import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// =====================================================================
// PUT: Cập nhật thông tin tài xế
// =====================================================================
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; 
    const session = await getCurrentUser();
    
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    const { name, phone, driverLicense, isActive, password } = body;

    // 1. Tìm tài xế cần sửa trước
    const driver = await User.findById(id);
    if (!driver) {
      return NextResponse.json({ message: 'Không tìm thấy tài xế' }, { status: 404 });
    }

    // 2. SECURITY CHECK (QUAN TRỌNG): 
    // Kiểm tra xem công ty của tài xế này (driver.companyId) có thuộc sở hữu của user đang đăng nhập (session.userId) không?
    const isOwnerOfDriverCompany = await Company.exists({
        _id: driver.companyId,
        ownerId: session.userId
    });

    if (!isOwnerOfDriverCompany) {
      return NextResponse.json({ 
        message: 'Bạn không có quyền sửa tài xế này (Tài xế thuộc nhà xe khác hoặc bạn không phải chủ sở hữu)' 
      }, { status: 403 });
    }

    // 3. Chuẩn bị dữ liệu update
    const updateData: any = { 
      name, 
      phone, 
      driverLicense, 
      isActive 
    };

    if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
    }

    // 4. Thực hiện update
    const updatedDriver = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');

    return NextResponse.json({ success: true, data: updatedDriver });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi cập nhật', error: error.message }, { status: 500 });
  }
}

// =====================================================================
// DELETE: Xóa tài xế
// =====================================================================
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getCurrentUser();

    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // 1. Tìm tài xế
    const driver = await User.findById(id);
    if (!driver) return NextResponse.json({ message: 'Không tìm thấy tài xế' }, { status: 404 });

    // 2. SECURITY CHECK: Logic tương tự như PUT
    const isOwnerOfDriverCompany = await Company.exists({
        _id: driver.companyId,
        ownerId: session.userId
    });

    if (!isOwnerOfDriverCompany) {
      return NextResponse.json({ message: 'Bạn không có quyền xóa tài xế này' }, { status: 403 });
    }

    await driver.deleteOne();

    return NextResponse.json({ success: true, message: 'Đã xóa tài xế thành công' });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa', error: error.message }, { status: 500 });
  }
}