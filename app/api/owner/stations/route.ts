import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Station } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// GET: Lấy danh sách để hiển thị trong Dropdown
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const stations = await Station.find({
      $or: [
        { status: 'active' },
        { status: 'pending', creatorId: session.userId }
      ]
    }).sort({ name: 1 });
    
    return NextResponse.json({ success: true, data: stations });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

// POST: Owner đề xuất địa điểm mới
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    
    const newStation = await Station.create({
        ...body,
        status: 'pending', 
        creatorId: session.userId 
    });

    return NextResponse.json({ success: true, data: newStation });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi tạo địa điểm', error: error.message }, { status: 500 });
  }
}