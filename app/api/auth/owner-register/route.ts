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
      email,          
      phone,          
      password,       
      companyName,    
      address,       
      description 
    } = body;

    // Validate cơ bản
    if (!password || !email || !phone) {
       return NextResponse.json({ message: 'Thiếu thông tin bắt buộc (Email, SĐT, Mật khẩu)' }, { status: 400 });
    }

    // 1. Kiểm tra Email hoặc SĐT đã tồn tại chưa
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email hoặc Số điện thoại đã được đăng ký trên hệ thống' },
        { status: 400 }
      );
    }

    // 2. Tạo User (Role = owner)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt); // Bây giờ password đã có dữ liệu

    const newUser = await User.create({
      name: fullName,
      email,
      phone,
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    });
    
    // 3. Tạo Company
    await Company.create({
      ownerId: newUser._id,
      name: companyName,
      address: address, // Lưu chuỗi địa chỉ đầy đủ
      hotline: phone,   // Lấy SĐT cá nhân làm hotline mặc định
      email: email,     // Lấy email cá nhân làm email cty mặc định
      description: description,
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