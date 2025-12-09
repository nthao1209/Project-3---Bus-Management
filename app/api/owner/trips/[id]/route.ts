import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Company } from '@/models/models';
import { getCurrentUserId } from '@/lib/auth';

// Định nghĩa Type cho Params (Next.js 15)
type RouteParams = {
  params: Promise<{ id: string }>;
};

// 1. GET: Xem chi tiết 1 chuyến đi
export async function GET(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; // Await params
    const session = await getCurrentUserId();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const trip = await Trip.findById(id)
      .populate('busId', 'plateNumber type seatLayout') // Lấy sơ đồ ghế để vẽ
      .populate('routeId', 'name defaultPickupPoints')
      .populate('driverId', 'name phone');

    if (!trip) return NextResponse.json({ message: 'Không tìm thấy chuyến đi' }, { status: 404 });

    // Kiểm tra quyền sở hữu thông qua Company
    const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });

    return NextResponse.json({ success: true, data: trip });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

// 2. PUT: Sửa chuyến đi (Đổi tài xế, đổi giờ, hủy chuyến...)
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; 
    const session = await getCurrentUserId();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();

    const trip = await Trip.findById(id);
    if (!trip) return NextResponse.json({ message: 'Không tìm thấy chuyến đi' }, { status: 404 });

    // Kiểm tra quyền
    const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền sửa' }, { status: 403 });

    // Update
    const updatedTrip = await Trip.findByIdAndUpdate(id, body, { new: true });

    return NextResponse.json({ success: true, data: updatedTrip });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi cập nhật', error: error.message }, { status: 500 });
  }
}

// 3. DELETE: Xóa chuyến đi
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; 
    const session = await getCurrentUserId();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const trip = await Trip.findById(id);
    if (!trip) return NextResponse.json({ message: 'Không tìm thấy chuyến đi' }, { status: 404 });

    const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền xóa' }, { status: 403 });

    await trip.deleteOne();
    return NextResponse.json({ success: true, message: 'Đã xóa chuyến đi' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa', error: error.message }, { status: 500 });
  }
}