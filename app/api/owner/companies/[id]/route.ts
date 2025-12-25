import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Company, User } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';


export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const { id } = await params;
    
    const company = await Company.findOne({ _id: id, ownerId: session.userId });

    if (!company) {
      return NextResponse.json({ message: 'Không tìm thấy nhà xe hoặc bạn không có quyền truy cập' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: company });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}


export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, description, hotline, email, address, logo } = body;

    const updatedCompany = await Company.findOneAndUpdate(
      { _id: id, ownerId: session.userId },
      { $set: { name, description, hotline, email, address, logo, updatedAt: new Date() } },
      { new: true }
    );

    if (!updatedCompany) return NextResponse.json({ message: 'Không tìm thấy nhà xe' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Cập nhật thành công', data: updatedCompany });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi cập nhật', error: error.message }, { status: 500 });
  }
}


export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const { id } = await params;

    const deletedCompany = await Company.findOneAndDelete({ _id: id, ownerId: session.userId });
    
    if (!deletedCompany) return NextResponse.json({ message: 'Không tìm thấy nhà xe' }, { status: 404 });

    const remainingCompanies = await Company.find({ ownerId: session.userId });
    if (remainingCompanies.length === 0) {
      await User.findByIdAndUpdate(session.userId, { role: 'user' });
    }

    return NextResponse.json({ success: true, message: 'Đã xóa nhà xe' });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa', error: error.message }, { status: 500 });
  }
}