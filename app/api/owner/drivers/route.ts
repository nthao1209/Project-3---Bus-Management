import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET: Giữ nguyên logic cũ (lấy list driver của owner)
export async function GET(req: Request) {
  // ... (Code cũ giữ nguyên)
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    // Lấy danh sách ID công ty của owner này
    const companies = await Company.find({ ownerId: session.userId }).select('_id');
    const companyIds = companies.map(c => c._id);

    // Tìm driver thuộc các công ty đó
    const drivers = await User.find({ role: 'driver', companyId: { $in: companyIds } })
      .select('-password')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: drivers });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 });
  }
}

// POST: Tạo tài khoản Tài xế mới (CẬP NHẬT LOGIC NHẬN companyId)
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    const { name, email, password, phone, driverLicense, companyId } = body;

    // 1. Validate: Kiểm tra companyId có được gửi lên không
    if (!companyId) {
        return NextResponse.json({ message: 'Vui lòng chọn Nhà xe quản lý' }, { status: 400 });
    }

    // 2. Validate: Kiểm tra Owner có thực sự sở hữu companyId này không (tránh hack)
    const isValidCompany = await Company.findOne({ _id: companyId, ownerId: session.userId });
    if (!isValidCompany) {
        return NextResponse.json({ message: 'Nhà xe không hợp lệ hoặc bạn không có quyền' }, { status: 403 });
    }

    // 3. Kiểm tra trùng Email/Phone
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return NextResponse.json({ message: 'Email hoặc SĐT đã tồn tại' }, { status: 400 });
    }

    // 4. Tạo User
    const hashedPassword = await bcrypt.hash(password, 10);
    const newDriver = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      driverLicense,
      role: 'driver',
      isActive: true,
      companyId: companyId
    });

    const { password: _, ...driverWithoutPass } = newDriver.toObject();
    return NextResponse.json({ success: true, data: driverWithoutPass }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi tạo tài xế', error: error.message }, { status: 500 });
  }
}