import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Company } from '@/models/models';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // Lấy param ?status=pending

    const filter = status ? { status } : {};
   // populate() noi bang User
    const companies = await Company.find(filter)
          .populate('ownerId', 'name email') // Lấy thông tin name và email của chủ xe
          .sort({ createdAt: -1 });    
      return NextResponse.json({ success: true, data: companies });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server' }, { status: 500 });
  }
}