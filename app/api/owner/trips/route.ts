import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Company, Route, Bus } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';


const calculateTripPoints = (
  baseDate: Date,
  points: any[],
  direction: 'forward' | 'backward' = 'forward'
) => {
  if (!Array.isArray(points)) return [];

  const validPoints = points.filter(
    p => p && p.name && p.name.trim() !== ''
  );

  if (direction === 'forward') {
    let prevTime: Date | null = null;

    return validPoints.map(p => {
      const offset = Number(p.timeOffset) || 0;
      const time = p.time
        ? new Date(p.time)
        : new Date(
            (prevTime ? prevTime.getTime() : baseDate.getTime()) +
              offset * 60000
          );

      prevTime = new Date(time);

      return {
        stationId: p.stationId || null,
        name: p.name,
        address: p.address || '',
        time,
        surcharge: Number(p.defaultSurcharge) || Number(p.surcharge) || 0
      };
    });
  }

  const pts = [...validPoints];
  let nextTime: Date | null = null;

  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    const offset = Number(p.timeOffset) || 0;

    const time: Date = p.time
      ? new Date(p.time)
      : new Date(
          (nextTime ? nextTime.getTime() : baseDate.getTime()) -
            offset * 60000
        );

    nextTime = new Date(time);

    pts[i] = {
      stationId: p.stationId || null,
      name: p.name,
      address: p.address || '',
      time,
      surcharge: Number(p.defaultSurcharge) || Number(p.surcharge) || 0
    };
  }

  return pts;
};

/* =======================
   TẠO TRẠNG THÁI GHẾ
======================= */
const generateSeatsStatus = (seatLayout: any) => {
  const seats: Record<string, any> = {};

  if (!seatLayout?.schema || !Array.isArray(seatLayout.schema)) {
    console.warn('seatLayout schema không hợp lệ');
    return seats;
  }

  seatLayout.schema.forEach((row: any[]) => {
    if (!Array.isArray(row)) return;

    row.forEach(seatCode => {
      if (seatCode === null || seatCode === undefined || seatCode === '') return;

      seats[String(seatCode)] = {
        status: 'available',
        bookingId: null,
        holdExpireAt: null
      };
    });
  });

  return seats;
};

/* =======================
   GET: LẤY DANH SÁCH TRIP
======================= */
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session)
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const companies = await Company.find({
      ownerId: session.userId
    }).select('_id');

    const companyIds = companies.map(c => c._id);

    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date');

    const filter: any = {
      companyId: { $in: companyIds }
    };

    if (dateFilter) {
      const start = new Date(dateFilter);
      start.setHours(0, 0, 0, 0);

      const end = new Date(dateFilter);
      end.setHours(23, 59, 59, 999);

      filter.departureTime = { $gte: start, $lte: end };
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

/* =======================
   POST: TẠO TRIP
======================= */
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session)
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    const {
      companyId,
      routeId,
      busId,
      driverId,
      departureTime,
      arrivalTime,
      basePrice,
      pickupPoints,
      dropoffPoints
    } = body;

    if (!departureTime || !arrivalTime)
      return NextResponse.json(
        { message: 'Thiếu giờ khởi hành hoặc giờ đến' },
        { status: 400 }
      );

    const depDate = new Date(departureTime);
    const arrDate = new Date(arrivalTime);

    if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime()))
      return NextResponse.json(
        { message: 'Ngày giờ không hợp lệ' },
        { status: 400 }
      );

    const company = await Company.findOne({
      _id: companyId,
      ownerId: session.userId
    });
    if (!company)
      return NextResponse.json(
        { message: 'Nhà xe không hợp lệ' },
        { status: 403 }
      );

    const route = await Route.findOne({ _id: routeId, companyId });
    const bus = await Bus.findOne({ _id: busId, companyId }).lean();

    if (!route || !bus)
      return NextResponse.json(
        { message: 'Xe hoặc tuyến không hợp lệ' },
        { status: 400 }
      );

    const finalPickupPoints =
      pickupPoints?.length > 0
        ? calculateTripPoints(depDate, pickupPoints, 'forward')
        : calculateTripPoints(
            depDate,
            route.defaultPickupPoints || [],
            'forward'
          );

    const finalDropoffPoints =
      dropoffPoints?.length > 0
        ? calculateTripPoints(arrDate, dropoffPoints, 'backward')
        : calculateTripPoints(
            arrDate,
            route.defaultDropoffPoints || [],
            'backward'
          );

    const seatsStatus = generateSeatsStatus(bus.seatLayout);

    const trip = await Trip.create({
      companyId,
      routeId,
      busId,
      driverId: driverId || null,
      departureTime: depDate,
      arrivalTime: arrDate,
      basePrice: Number(basePrice),
      pickupPoints: finalPickupPoints,
      dropoffPoints: finalDropoffPoints,
      seatsStatus,
      status: 'scheduled'
    });

    return NextResponse.json({ success: true, data: trip }, { status: 201 });
  } catch (error: any) {
    console.error('CREATE TRIP ERROR:', error);
    return NextResponse.json(
      { message: 'Lỗi tạo chuyến đi: ' + error.message },
      { status: 500 }
    );
  }
}
