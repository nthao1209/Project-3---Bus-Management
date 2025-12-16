import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Định nghĩa kiểu cho params (Next.js 15)
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

    // 1. Tìm công ty của Owner đang đăng nhập
    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) {
      return NextResponse.json({ message: 'Bạn chưa có nhà xe' }, { status: 403 });
    }

    // 2. Tìm tài xế cần sửa
    const driver = await User.findById(id);
    if (!driver) {
      return NextResponse.json({ message: 'Không tìm thấy tài xế' }, { status: 404 });
    }

    // 3. SECURITY CHECK: Kiểm tra tài xế này có thuộc công ty này không
    // Lưu ý: So sánh string của ObjectId
    if (driver.companyId?.toString() !== company._id.toString()) {
      return NextResponse.json({ message: 'Bạn không có quyền sửa tài xế này' }, { status: 403 });
    }

    // 4. Chuẩn bị dữ liệu update
    const updateData: any = { 
      name, 
      phone, 
      driverLicense, 
      isActive 
    };

    // Nếu có đổi mật khẩu thì mới hash, không thì thôi
    if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
    }

    // 5. Thực hiện update
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

    // 1. Tìm công ty của Owner
    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) return NextResponse.json({ message: 'Chưa có nhà xe' }, { status: 403 });

    // 2. Tìm tài xế
    const driver = await User.findById(id);
    if (!driver) return NextResponse.json({ message: 'Không tìm thấy tài xế' }, { status: 404 });

    // 3. SECURITY CHECK: Chỉ xóa nếu thuộc đúng công ty
    if (driver.companyId?.toString() !== company._id.toString()) {
      return NextResponse.json({ message: 'Bạn không có quyền xóa tài xế này' }, { status: 403 });
    }

    // 4. Xóa
    await driver.deleteOne();

    return NextResponse.json({ success: true, message: 'Đã xóa tài xế thành công' });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa', error: error.message }, { status: 500 });
  }
}