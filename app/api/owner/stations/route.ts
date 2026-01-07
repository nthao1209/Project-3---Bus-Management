import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Station } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// GET: Lấy danh sách để hiển thị trong Dropdown
export async function GET(req: Request) {
  try {
    await dbConnect();

    // Allow public read of active stations (used by the public search UI)
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status'); // e.g. 'active'

    const session = await getCurrentUser();

    // If client is unauthenticated and requests something other than public active list, block
    if (!session && statusParam !== 'active') {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    // Build filter: if unauthenticated & requesting active, return only active stations
    // otherwise allow owner to see their pending stations too
    let filter: any;
    if (!session && statusParam === 'active') {
      filter = { status: 'active' };
    } else {
      filter = {
        $or: [
          { status: 'active' },
          { status: 'pending', creatorId: session?.userId }
        ]
      };
      // If explicit status param provided, respect it (e.g. ?status=active)
      if (statusParam) filter = { status: statusParam };
    }

    const stations = await Station.find(filter).sort({ name: 1 });
    
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