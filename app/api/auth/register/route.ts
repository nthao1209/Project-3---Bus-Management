import { NextResponse } from 'next/server';
import {dbConnect} from '@/lib/dbConnect';
import { User } from '@/models/models';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, password, phone, role } = await req.json();

    // 1. Kiểm tra dữ liệu đầu vào
    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin' },
        { status: 400 }
      );
    }

    // 2. Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email này đã được đăng ký' },
        { status: 400 }
      );
    }

    // 3. Mã hóa mật khẩu (Hashing)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Tạo user mới
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || 'user', 
    });

    return NextResponse.json(
      { message: 'Đăng ký thành công', userId: newUser._id },
      { status: 201 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi server', error: error.message },
      { status: 500 }
    );
  }
}