import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Bus, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const companies = await Company.find({ ownerId: session.userId }).select('_id');
    const companyIds = companies.map(c => c._id);

    const buses = await Bus.find({ companyId: { $in: companyIds } })
      .populate('companyId', 'name') 
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: buses });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    const {
        companyId,
        plateNumber,
        type,
        amenities,
        status,
        seatLayout
      } = body;

    const seatsData = seatLayout?.schema || seatLayout?.seats;

    if (!seatLayout || !seatsData || !seatsData.length) {
        return NextResponse.json(
          { message: 'Cần định nghĩa sơ đồ ghế (seats/schema)' },
          { status: 400 }
        );
      }

    const company = await Company.findOne({ _id: companyId, ownerId: session.userId });
    
    if (!company) {
      return NextResponse.json({ message: 'Nhà xe không tồn tại hoặc bạn không có quyền' }, { status: 403 });
    }

    const finalSeatLayout = {
        totalSeats: seatLayout.totalSeats,
        totalFloors: seatLayout.totalFloors || 1,
        schema: seatsData 
    };

    const newBus = await Bus.create({ 
      companyId, 
      plateNumber, 
      type, 
      amenities,
      seatLayout: finalSeatLayout, 
      status 
    });

    return NextResponse.json({ success: true, data: newBus }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi tạo xe', error: error.message }, { status: 500 });
  }
}