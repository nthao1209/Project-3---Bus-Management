import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User, Company } from '@/models/models';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { 
      fullName, phone, email, password, // Thông tin User
      companyName, province, fleetSize, note // Thông tin Nhà xe
    } = body;

    // 1. Kiểm tra Email hoặc SĐT đã tồn tại chưa
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email hoặc Số điện thoại đã được đăng ký' },
        { status: 400 }
      );
    }

    // 2. Tạo User (Role = owner)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    });

    // 3. Tạo Company (Trạng thái pending chờ duyệt)
    // Lưu ý: fleetSize và note mình sẽ gộp vào description để đơn giản hoá DB hiện tại
    const descriptionText = `Quy mô: ${fleetSize}. Ghi chú: ${note}`;
    
    await Company.create({
      ownerId: newUser._id,
      name: companyName,
      address: province, // Tạm lưu tỉnh vào address
      hotline: phone,    // Lấy SĐT cá nhân làm hotline tạm
      description: descriptionText,
      status: 'pending'
    });

    return NextResponse.json(
      { success: true, message: 'Đăng ký nhà xe thành công!' },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Partner Register Error:", error);
    return NextResponse.json(
      { message: 'Lỗi hệ thống', error: error.message },
      { status: 500 }
    );
  }
}