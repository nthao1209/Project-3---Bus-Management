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
   Tính pickup / dropoff - CORRECT VERSION
======================= */
const calculateTripPoints = (
  baseDate: Date,
  points: any[],
  pointType: 'pickup' | 'dropoff'
) => {
  if (!Array.isArray(points)) {
    console.warn('[POINT] points is not array');
    return [];
  }

  const validPoints = points.filter(
    p => p && p.name && p.name.trim() !== ''
  );

  console.log(`[POINT] ${pointType} points count:`, validPoints.length);

  // Sắp xếp points theo timeOffset
  const sortedPoints = [...validPoints].sort((a, b) => {
    const offsetA = Number(a.timeOffset) || 0;
    const offsetB = Number(b.timeOffset) || 0;
    
    if (pointType === 'pickup') {
      return offsetA - offsetB; // Tăng dần cho pickup
    } else {
      return offsetB - offsetA; // Giảm dần cho dropoff (điểm cuối trước)
    }
  });

  if (pointType === 'pickup') {
    // Pickup: tính từ baseDate + offset
    return sortedPoints.map((p) => {
      const offset = Number(p.timeOffset) || 0;
      const time = new Date(baseDate.getTime() + offset * 60000);

      return {
        stationId: p.stationId || null,
        name: p.name,
        address: p.address || '',
        time,
        surcharge: Number(p.defaultSurcharge ?? p.surcharge ?? 0),
        timeOffset: offset,
      };
    });
  } else {   
    
    let cumulativeOffset = 0;
    const results = [];

    for (const p of sortedPoints) {
      const offset = Number(p.timeOffset) || 0;
      const time = new Date(baseDate.getTime() - cumulativeOffset * 60000);
      
      results.unshift({ 
        stationId: p.stationId || null,
        name: p.name,
        address: p.address || '',
        time,
        surcharge: Number(p.defaultSurcharge ?? p.surcharge ?? 0),
        timeOffset: offset,
      });

      cumulativeOffset += offset;
    }

    return results;
  }
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
    const { templateIds, startDate: reqStart, endDate: reqEnd } = body;
    
    const startDate = reqStart ? new Date(reqStart) : new Date();
    const endDate = reqEnd ? new Date(reqEnd) : (() => {
        const d = new Date(); d.setDate(d.getDate() + 30); return d;
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

    const query: any = { active: true };

    if (Array.isArray(templateIds) && templateIds.length > 0) {
      query._id = { $in: templateIds };
    }

    const templates = await TripTemplate.find(query)
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
      console.log('--- PROCESSING TEMPLATE ---', template._id);

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
          departureTime.getTime() + template.durationMinutes * 60000
        );

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
          departureTime,  // Base time cho pickup là departureTime
          pickupSource,
          'pickup'
        );

        const dropoffPoints = calculateTripPoints(
          arrivalTime,    // Base time cho dropoff là arrivalTime
          dropoffSource,
          'dropoff'
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