import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User, Company } from '@/models/models';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      fullName,
      userEmail,
      phone,
      password,
      companyName,
      companyEmail,
      address,
      description,
    } = body;
    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { message: 'Vui lòng nhập họ và tên' },
        { status: 400 }
      );
    }

    if (!userEmail || !userEmail.trim()) {
      return NextResponse.json(
        { message: 'Vui lòng nhập email đăng nhập' },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { message: 'Vui lòng nhập số điện thoại' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { message: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { message: 'Vui lòng nhập tên nhà xe' },
        { status: 400 }
      );
    }

    if (!companyEmail || !companyEmail.trim()) {
      return NextResponse.json(
        { message: 'Vui lòng nhập email nhà xe' },
        { status: 400 }
      );
    }
    const existingUser = await User.findOne({
      $or: [{ email: userEmail }, { phone }],
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email hoặc số điện thoại đã được sử dụng' },
        { status: 400 }
      );
    }
    const existingCompanyEmail = await Company.findOne({
      email: companyEmail,
    });

    if (existingCompanyEmail) {
      return NextResponse.json(
        { message: 'Email nhà xe đã tồn tại' },
        { status: 400 }
      );
    }
    const existingCompanyName = await Company.findOne({
      name: companyName,
    });

    if (existingCompanyName) {
      return NextResponse.json(
        { message: 'Tên nhà xe đã tồn tại' },
        { status: 400 }
      );
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: fullName.trim(),
      email: userEmail.trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    });

    const company = await Company.create({
      ownerId: newUser._id,
      name: companyName.trim(),
      address,
      hotline: phone.trim(),
      email: companyEmail.trim(),
      description,
      status: 'pending',
    });

    await User.findByIdAndUpdate(newUser._id, {
      companyId: company._id,
    });
    return NextResponse.json(
      {
        success: true,
        message:
          'Đăng ký thành công! Hồ sơ nhà xe của bạn đang chờ quản trị viên phê duyệt.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Owner Register Error:', error);

    return NextResponse.json(
      {
        message: 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.',
      },
      { status: 500 }
    );
  }
}
