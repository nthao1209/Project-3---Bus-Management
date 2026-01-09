// File: app/api/owner/bookings/by-trip/[tripId]/route.ts

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Booking, Trip, Company } from '@/models/models'; // Đảm bảo import đúng model
import { getCurrentUser } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ tripId: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { tripId } = await params;

    // 1. Kiểm tra quyền truy cập
    const session = await getCurrentUser();
    if (!session || !['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2. Lấy thông tin Chuyến xe để kiểm tra quyền sở hữu & Tổng số ghế
    const trip = await Trip.findById(tripId).lean();
    
    if (!trip) {
      return NextResponse.json({ message: 'Trip not found' }, { status: 404 });
    }

    if (session.role === 'owner') {
      const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
      if (!isOwner) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    const bookings = await Booking.find({ tripId: tripId })
      .sort({ createdAt: -1 }) // Mới nhất lên đầu
      .lean();

    // 4. Tính toán tổng số ghế của xe (để hiển thị thống kê 20/40 ghế...)
    // Giả sử seatsStatus lưu dạng { "A01": {...}, "A02": {...} }
    const totalSeats = trip.seatsStatus ? Object.keys(trip.seatsStatus).length : 40;

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookings,
        totalSeats: totalSeats
      }
    });

  } catch (error: any) {
    console.error('Get bookings by trip error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Server error' 
    }, { status: 500 });
  }
}