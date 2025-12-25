import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { TripTemplate, Company, Route } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// ================= GET =================
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) {
      return NextResponse.json({ success: true, data: [] });
    }

    const templates = await TripTemplate.find({
      companyId: company._id,
      active: true
    })
      .populate('routeId', 'name defaultPickupPoints defaultDropoffPoints')
      .populate('busId', 'plateNumber type')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: templates });
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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    let {
      routeId,
      busId,
      driverId,
      departureTimeStr,
      durationMinutes,
      daysOfWeek,
      basePrice,
      pickupPoints,
      dropoffPoints
    } = body;

    if (!departureTimeStr) {
      throw new Error('departureTimeStr is required');
    }

    if (typeof departureTimeStr === 'string' && departureTimeStr.includes('T')) {
      departureTimeStr = departureTimeStr.slice(11, 16);
    }

    if (!/^\d{2}:\d{2}$/.test(departureTimeStr)) {
      throw new Error(`departureTimeStr must be HH:mm, got ${departureTimeStr}`);
    }

    const company = await Company.findOne({ ownerId: session.userId });
    if (!company) {
      return NextResponse.json({ message: 'Chưa có nhà xe' }, { status: 403 });
    }

    const route = await Route.findOne({
      _id: routeId,
      companyId: company._id
    });

    if (!route) {
      return NextResponse.json({ message: 'Tuyến không hợp lệ' }, { status: 400 });
    }

    const finalPickupPoints = (Array.isArray(pickupPoints) && pickupPoints.length > 0)
      ? pickupPoints.map((p: any) => ({
          stationId: p.stationId,
          name: p.name,
          address: p.address,
          timeOffset: Number(p.timeOffset) || 0,        
          defaultSurcharge: Number(p.defaultSurcharge) || 0
        }))
      : route.defaultPickupPoints; 

    const finalDropoffPoints = (Array.isArray(dropoffPoints) && dropoffPoints.length > 0)
      ? dropoffPoints.map((p: any) => ({
          stationId: p.stationId,
          name: p.name,
          address: p.address,
          timeOffset: Number(p.timeOffset) || 0,
          defaultSurcharge: Number(p.defaultSurcharge) || 0
        }))
      : route.defaultDropoffPoints;

    const template = await TripTemplate.create({
      companyId: company._id,
      routeId,
      busId,
      driverId,
      departureTimeStr,
      durationMinutes,
      daysOfWeek,
      basePrice,
      pickupPoints: finalPickupPoints,
      dropoffPoints: finalDropoffPoints,
      active: true
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
