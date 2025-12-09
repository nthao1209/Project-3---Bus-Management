import { NextResponse } from 'next/server';
import {dbConnect} from '@/lib/dbConnect';
import { User,Company } from '@/models/models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers'; // Dùng để set cookie an toàn

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'Email hoặc mật khẩu không đúng' },
        { status: 400 }
      );
    }
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }
    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Email hoặc mật khẩu không đúng' },
        { status: 400 }
      );
    }

    let companyStatus = null;
    if(user.role === 'owner'){
      const company = await Company.findOne({ ownerId: user._id });
      companyStatus = company?.status || 'pending';
    }
    // 3. Tạo Token (JWT)
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      companyStatus,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
      expiresIn: '7d', // Token hết hạn sau 7 ngày
    });

    // 4. Lưu token vào Cookie (HttpOnly - JavaScript frontend không đọc được để tránh XSS)
    // Cần await cookies() trong Next.js mới
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
      path: '/',
    });

    // 5. Trả về thông tin user (trừ password)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    return NextResponse.json(
      { message: 'Đăng nhập thành công', user: userData },
      { status: 200 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi server', error: error.message },
      { status: 500 }
    );
  }
}