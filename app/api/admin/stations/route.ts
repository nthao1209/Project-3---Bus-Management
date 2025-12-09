import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Station } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// GET: Lấy danh sách (Hỗ trợ lọc theo status)
export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const province = searchParams.get('province');
  const status = searchParams.get('status'); // 'active' hoặc 'pending'

  let filter: any = {};
  if (province) filter.province = province;
  if (status) filter.status = status;

  // Nếu không truyền status, mặc định lấy active (để app khách hàng dùng) 
  // Hoặc nếu là trang Admin thì ta có thể truyền status=all nếu cần logic khác
  
  const stations = await Station.find(filter)
    .populate('creatorId', 'name email') // Để biết ai đề xuất
    .sort({ createdAt: -1 });
  
  return NextResponse.json({ success: true, data: stations });
}

// POST: Tạo bến xe mới
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser(); // Hàm check auth của bạn
    
    // Mặc định: Nếu Admin tạo -> Active, Nếu Owner tạo -> Pending
    let initialStatus = 'pending';
    if (session && session.role === 'admin') {
        initialStatus = 'active';
    }

    const body = await req.json();
    
    const newStation = await Station.create({
        ...body,
        status: initialStatus,
        creatorId: session?.userId // Lưu người tạo
    });

    return NextResponse.json({ success: true, data: newStation });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi tạo bến xe', error: error.message }, { status: 500 });
  }
}