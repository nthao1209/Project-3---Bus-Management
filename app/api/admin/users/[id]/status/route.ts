import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/models/models';

type RouteParams = { params: Promise<{ id: string }> };

// PUT: Cập nhật trạng thái
export async function PUT(req: Request, { params }: RouteParams) {
  await dbConnect();
  const { id } = await params;
  const { isActive } = await req.json(); // true hoặc false

  await User.findByIdAndUpdate(id, { isActive });
  return NextResponse.json({ success: true, message: 'Cập nhật trạng thái thành công' });
}

// DELETE: Xóa user
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy user' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Xóa user thành công' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
