import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Company, User } from '@/models/models';
import { getCurrentUser} from '@/lib/auth'; // Import hàm của bạn

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    // 1. Lấy thông tin user từ token
    const session = await getCurrentUser();
    
    // 2. Kiểm tra đăng nhập
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực người dùng' }, { status: 401 });
    }

    // 3. Dùng session.userId để query (Thay vì dùng session trực tiếp)
    const companies = await Company.find({ ownerId: session.userId }).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: companies });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực người dùng' }, { status: 401 });
    }

    const body = await req.json();
    console.log('CREATE COMPANY BODY:', body);

    const { name, description, hotline, email, address } = body;

    if (!name || !hotline) return NextResponse.json({ message: 'Tên và hotline bắt buộc' }, { status: 400 });

    const newCompany = await Company.create({
      ownerId: session.userId, // Lấy ID từ object session
      name,
      description,
      hotline,
      email,
      address,
      status: 'pending'
    });

    // Update role nếu cần
    if (session.role !== 'owner') {
         await User.findByIdAndUpdate(session.userId, { role: 'owner' });
    }

    return NextResponse.json({ success: true, message: 'Tạo thành công', data: newCompany }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi tạo', error: error.message }, { status: 500 });
  }
}