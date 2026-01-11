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

    const processPoints = (points: any[], defaultPoints: any[], pointType: 'pickup' | 'dropoff') => {
      if (Array.isArray(points) && points.length > 0) {
        return points.map((p: any, index: number) => ({
          stationId: p.stationId || null,
          name: p.name,
          address: p.address || '',
          timeOffset: Number(p.timeOffset) || (pointType === 'pickup' ? -index * 10 : index * 10),
        }));
      } else if (Array.isArray(defaultPoints) && defaultPoints.length > 0) {
        return defaultPoints.map((p: any, index: number) => {
          const pointData = p.toObject ? p.toObject() : p;
          
          return {
            stationId: pointData.stationId || null,
            name: pointData.name,
            address: pointData.address || '',
            timeOffset: pointData.timeOffset !== undefined && pointData.timeOffset !== null 
              ? Number(pointData.timeOffset) 
              : (pointType === 'pickup' ? -index * 10 : index * 10),
          };
        });
      }
      return [];
    };

    const finalPickupPoints = processPoints(pickupPoints, route.defaultPickupPoints, 'pickup');
    const finalDropoffPoints = processPoints(dropoffPoints, route.defaultDropoffPoints, 'dropoff');

  

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

    const savedTemplate = await TripTemplate.findById(template._id).lean();
   

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    console.error('Template creation error:', error);
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}