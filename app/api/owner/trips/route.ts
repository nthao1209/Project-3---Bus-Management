import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Company, Route, Bus } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const companies = await Company.find({ ownerId: session.userId }).select('_id');
    const companyIds = companies.map(c => c._id);

    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date');

    let filter: any = { companyId: { $in: companyIds } };

    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);
      filter.departureTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const trips = await Trip.find(filter)
      .populate('busId', 'plateNumber type')
      .populate('routeId', 'name')
      .populate('driverId', 'name phone')
      .sort({ departureTime: 1 });

    return NextResponse.json({ success: true, data: trips });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi server', error: error.message },
      { status: 500 }
    );
  }
}

// ================= POST =================

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyId,
      routeId,
      busId,
      departureTime,
      arrivalTime,
      basePrice,
      pickupPoints,    // optional
      dropoffPoints    // optional
    } = body;

    // 1. Kiểm tra Company
    const company = await Company.findOne({
      _id: companyId,
      ownerId: session.userId
    });
    if (!company) {
      return NextResponse.json({ message: 'Nhà xe không hợp lệ' }, { status: 403 });
    }

    // 2. Kiểm tra Route & Bus
    const route = await Route.findOne({ _id: routeId, companyId });
    const bus = await Bus.findOne({ _id: busId, companyId });

    if (!route || !bus) {
      return NextResponse.json(
        { message: 'Xe hoặc Tuyến đường không thuộc nhà xe này' },
        { status: 400 }
      );
    }

    // 3. LOGIC COPY / OVERRIDE PICKUP & DROPOFF
    const finalPickupPoints =
      Array.isArray(pickupPoints) && pickupPoints.length > 0
        ? pickupPoints
        : route.defaultPickupPoints;

    const finalDropoffPoints =
      Array.isArray(dropoffPoints) && dropoffPoints.length > 0
        ? dropoffPoints
        : route.defaultDropoffPoints;

    // 4. Tạo Trip
    const newTrip = await Trip.create({
      companyId,
      routeId,
      busId,
      departureTime,
      arrivalTime,
      basePrice,
      pickupPoints: finalPickupPoints,
      dropoffPoints: finalDropoffPoints,
      status: 'scheduled'
    });

    return NextResponse.json(
      { success: true, data: newTrip },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi tạo chuyến đi', error: error.message },
      { status: 500 }
    );
  }
}
