import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Station } from '@/models/models';

type RouteParams = { params: Promise<{ id: string }> };

// PUT: Sửa thông tin (Tên, địa chỉ...)
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const updatedStation = await Station.findByIdAndUpdate(id, body, { new: true });
    if (!updatedStation) return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 });

    return NextResponse.json({ success: true, data: updatedStation });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa bến xe
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const deletedStation = await Station.findByIdAndDelete(id);
    if (!deletedStation) return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Đã xóa thành công' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}