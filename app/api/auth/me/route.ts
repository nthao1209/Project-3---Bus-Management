import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/models/models';

export async function GET() {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(null, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const user = await User.findById(decoded.userId).select(
      '_id name email phone role'
    );

    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }

    return NextResponse.json({
      userId: user._id,
      name: user.name,    
      email: user.email,
      role: user.role,
      phone: user.phone,
    });
  } catch (err) {
    return NextResponse.json(null, { status: 401 });
  }
}
