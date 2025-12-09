import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User } from '@/models/models';

export async function GET(req: Request) {
  await dbConnect();
  
  // Lọc role là user, owner hoặc driver
  const users = await User.find({ role: { $in: ['user', 'owner', 'driver'] } }).sort({ createdAt: -1 });
  
  return NextResponse.json({ success: true, data: users });
}
