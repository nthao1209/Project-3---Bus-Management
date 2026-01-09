import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, TripTemplate, Bus } from '@/models/models';

/* =======================
   Tạo trạng thái ghế
======================= */
const generateSeatsStatus = (seatLayout: any) => {
  const seats: Record<string, any> = {};

  if (!seatLayout?.schema || !Array.isArray(seatLayout.schema)) {
    console.warn('[SEAT] Invalid seatLayout:', seatLayout);
    return seats;
  }

  seatLayout.schema.forEach((row: any[]) => {
    if (!Array.isArray(row)) return;

    row.forEach(seatCode => {
      if (!seatCode) return;

      seats[String(seatCode)] = {
        status: 'available',
        bookingId: null,
        holdExpireAt: null,
      };
    });
  });

  console.log('[SEAT] Generated seats:', Object.keys(seats).length);
  return seats;
};

/* =======================
   Tạo Date từ HH:mm
======================= */
const createDateFromTime = (baseDate: Date, timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
};

/* =======================
   Tính pickup / dropoff
======================= */
const calculateTripPoints = (
  baseDate: Date,
  points: any[],
  direction: 'forward' | 'backward'
) => {
  if (!Array.isArray(points)) {
    console.warn('[POINT] points is not array');
    return [];
  }

  const validPoints = points.filter(
    p => p && p.name && p.name.trim() !== ''
  );

  console.log(`[POINT] ${direction} points count:`, validPoints.length);

  if (direction === 'forward') {
    let prevTime: Date | null = null;

    return validPoints.map((p, idx) => {
      const offset = Number(p.timeOffset) || 0;

      const time = p.time
        ? new Date(p.time)
        : new Date(
            (prevTime ? prevTime.getTime() : baseDate.getTime()) +
              offset * 60000
          );

      prevTime = new Date(time);

      const result = {
        stationId: p.stationId || null,
        name: p.name,
        address: p.address || '',
        time,
        surcharge: Number(p.defaultSurcharge ?? p.surcharge ?? 0),
      };

      console.log(`[POINT][FORWARD][${idx}]`, result);
      return result;
    });
  }

  // backward
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
      surcharge: Number(p.defaultSurcharge ?? p.surcharge ?? 0),
    };

    console.log(`[POINT][BACKWARD][${i}]`, pts[i]);
  }

  return pts;
};

/* =======================
   API POST
======================= */
export async function POST(req: Request) {
  try {
    console.log('========== GENERATE TRIPS START ==========');
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    console.log('[BODY]', body);

    const startDate = body.startDate
      ? new Date(body.startDate)
      : new Date();

    const endDate = body.endDate
      ? new Date(body.endDate)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          return d;
        })();

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const daysToGenerate =
      Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

    console.log('[DATE RANGE]', {
      startDate,
      endDate,
      daysToGenerate,
    });

    const templates = await TripTemplate.find({ active: true })
      .populate('routeId')
      .lean();

    console.log('[TEMPLATE] Found:', templates.length);

    if (!templates.length) {
      return NextResponse.json({
        success: true,
        message: 'Không có TripTemplate active',
      });
    }

    let createdCount = 0;

    for (const template of templates) {
      console.log('--- TEMPLATE ---', template._id);

      const route = template.routeId as any;
      if (!route) {
        console.warn('[ROUTE] Missing route');
        continue;
      }

      for (let i = 0; i < daysToGenerate; i++) {
        const tripDate = new Date(startDate);
        tripDate.setDate(startDate.getDate() + i);

        if (
          Array.isArray(template.daysOfWeek) &&
          template.daysOfWeek.length &&
          !template.daysOfWeek.includes(tripDate.getDay())
        ) {
          console.log('[SKIP] Not in daysOfWeek:', tripDate);
          continue;
        }

        const departureTime = createDateFromTime(
          tripDate,
          template.departureTimeStr
        );

        const arrivalTime = new Date(
          departureTime.getTime() +
            template.durationMinutes * 60000
        );

        console.log('[TIME]', {
          departureTime,
          arrivalTime,
        });

        const exists = await Trip.exists({
          busId: template.busId,
          departureTime: {
            $gte: new Date(departureTime.getTime() - 5 * 60000),
            $lte: new Date(departureTime.getTime() + 5 * 60000),
          },
          status: { $ne: 'cancelled' },
        });

        if (exists) {
          console.log('[SKIP] Trip already exists');
          continue;
        }

        const pickupSource =
          template.pickupPoints?.length
            ? template.pickupPoints
            : route.defaultPickupPoints || [];

        const dropoffSource =
          template.dropoffPoints?.length
            ? template.dropoffPoints
            : route.defaultDropoffPoints || [];

        const pickupPoints = calculateTripPoints(
          departureTime,
          pickupSource,
          'forward'
        );

        const dropoffPoints = calculateTripPoints(
          arrivalTime,
          dropoffSource,
          'backward'
        );

        const bus = await Bus.findById(template.busId).lean();
        if (!bus) {
          console.warn('[BUS] Not found:', template.busId);
          continue;
        }

        const seatsStatus = generateSeatsStatus(bus.seatLayout);

        const createdTrip = await Trip.create({
          companyId: template.companyId,
          routeId: route._id,
          busId: template.busId,
          driverId: template.driverId,
          departureTime,
          arrivalTime,
          basePrice: template.basePrice,
          pickupPoints,
          dropoffPoints,
          seatsStatus,
          status: 'scheduled',
        });

        console.log('[CREATED TRIP]', createdTrip._id);
        createdCount++;
      }
    }

    console.log('========== GENERATE TRIPS END ==========');

    return NextResponse.json({
      success: true,
      message: `Đã sinh ${createdCount} chuyến từ ${startDate
        .toISOString()
        .slice(0, 10)} đến ${endDate.toISOString().slice(0, 10)}`,
    });
  } catch (error: any) {
    console.error('Generate trips error:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Server error',
      },
      { status: 500 }
    );
  }
}
