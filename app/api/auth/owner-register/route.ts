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
      description 
    } = body;

    if (!password || !userEmail || !phone || !companyName || !companyEmail) {
       return NextResponse.json({ message: 'Thiếu thông tin bắt buộc (Email, SĐT, Mật khẩu)' }, { status: 400 });
    }

    const existingUser = await User.findOne({
      $or: [{ email: userEmail }, { phone }]
    });
    if (existingUser) {
      return NextResponse.json({ message: 'Email hoặc SĐT đã tồn tại' }, { status: 400 });
    }

    const existingCompany = await Company.findOne({ email: companyEmail });
    if (existingCompany) {
      return NextResponse.json({ message: 'Email nhà xe đã tồn tại' }, { status: 400 });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt); // Bây giờ password đã có dữ liệu

    const newUser = await User.create({
      name: fullName,
      email: userEmail,
      phone,
      password: hashedPassword,
      role: 'owner',
      isActive: true,
    });
    
    await Company.create({
      ownerId: newUser._id,
      name: companyName,
      address: address, 
      hotline: phone,   
      email: companyEmail,   
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