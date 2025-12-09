import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Station } from '@/models/models';

type RouteParams = { params: Promise<{ id: string }> };

// PUT: Chỉ update status (Duyệt/Từ chối)
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const { status } = await req.json(); // 'active' hoặc 'rejected'

    const station = await Station.findByIdAndUpdate(id, { status }, { new: true });
    if (!station) return NextResponse.json({ message: 'Không tìm thấy' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 });
  }
}