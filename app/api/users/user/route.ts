import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/models/models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

async function getCurrentUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

export async function GET() {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });
    }

    const user = await User.findOne({ _id: userId, isActive: true }).select('-password');
    
    if (!user) {
      return NextResponse.json({ message: 'Tài khoản không tồn tại hoặc đã bị khóa' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi Server', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) { 
  try {
    await dbConnect();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, password, newPassword } = body;

    const user = await User.findOne({ _id: userId, isActive: true });
    if (!user) return NextResponse.json({ message: 'User không tồn tại hoặc bị khóa' }, { status: 404 });

    if (name) user.name = name;
    if (phone) user.phone = phone;

    // Kiểm tra trùng Email nếu người dùng đổi Email
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return NextResponse.json({ message: 'Email này đã được sử dụng bởi tài khoản khác' }, { status: 400 });
      }
      user.email = email;
    }

    // --- Đổi mật khẩu ---
    if (password && newPassword) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return NextResponse.json({ message: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
      }
      
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Cập nhật thành công',
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi cập nhật', error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await dbConnect();
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 });
    }

    await User.findByIdAndUpdate(userId, { isActive: false });

    // Xóa cookie token
    const cookieStore = await cookies();
    cookieStore.delete('token');

    return NextResponse.json({ success: true, message: 'Tài khoản đã bị vô hiệu hóa thành công' });

  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa tài khoản', error: error.message }, { status: 500 });
  }
}