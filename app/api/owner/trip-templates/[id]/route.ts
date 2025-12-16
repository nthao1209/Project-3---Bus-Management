import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { TripTemplate, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// Định nghĩa kiểu Params cho Next.js 15
type RouteParams = {
  params: Promise<{ id: string }>;
};

// 1. PUT: Cập nhật mẫu lịch trình
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; // Bắt buộc await trong Next.js 15
    const session = await getCurrentUser();
    
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // Lấy thông tin body gửi lên
    const body = await req.json();

    // Tìm Company của Owner để đảm bảo bảo mật (chỉ sửa của chính mình)
    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) {
      return NextResponse.json({ message: 'Không tìm thấy thông tin nhà xe' }, { status: 403 });
    }

    // Tìm và Update
    // Điều kiện: _id phải khớp VÀ companyId phải khớp với owner đang đăng nhập
    const updatedTemplate = await TripTemplate.findOneAndUpdate(
      { _id: id, companyId: company._id },
      body,
      { new: true } // Trả về dữ liệu mới sau khi update
    );

    if (!updatedTemplate) {
      return NextResponse.json({ message: 'Không tìm thấy lịch trình hoặc bạn không có quyền sửa' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedTemplate });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi cập nhật', error: error.message }, { status: 500 });
  }
}

// 2. DELETE: Xóa mẫu lịch trình
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getCurrentUser();

    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // Tìm Company
    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) {
      return NextResponse.json({ message: 'Chưa có nhà xe' }, { status: 403 });
    }

    // Tìm và Xóa
    // Chỉ xóa được nếu đúng là của company đó tạo ra
    const deletedTemplate = await TripTemplate.findOneAndDelete({ 
      _id: id, 
      companyId: company._id 
    });

    if (!deletedTemplate) {
      return NextResponse.json({ message: 'Không tìm thấy lịch trình để xóa' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa mẫu lịch trình thành công' });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa dữ liệu', error: error.message }, { status: 500 });
  }
}