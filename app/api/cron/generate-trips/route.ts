import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, TripTemplate, Bus } from '@/models/models';

const generateSeatsStatus = (seatLayout: any) => {
  const seats: Record<string, any> = {};

  if (!seatLayout) {
    console.warn("⚠️ generateSeatsStatus: seatLayout is null/undefined");
    return seats;
  }
  
  // Kiểm tra xem schema có tồn tại và là Array không
  if (!seatLayout.schema || !Array.isArray(seatLayout.schema)) {
    console.warn("⚠️ generateSeatsStatus: seatLayout.schema is missing or not an array", JSON.stringify(seatLayout));
    return seats;
  }

  seatLayout.schema.forEach((row: any[]) => {
    if (Array.isArray(row)) {
      row.forEach(seatCode => {
        // Chỉ bỏ qua nếu là null, undefined hoặc chuỗi rỗng (chấp nhận số 0)
        if (seatCode === null || seatCode === undefined || seatCode === '') return;
        
        // Tạo object đúng cấu trúc SeatInfoSchema
        seats[String(seatCode)] = { 
          status: 'available',
          bookingId: undefined, // Explicitly undefined is fine
          holdExpireAt: undefined
        };
      });
    }
  });

  // Log kết quả cuối cùng trước khi lưu
  console.log(`✅ Generated ${Object.keys(seats).length} seats`);
  return seats;
};


const createDateFromTime = (baseDate: Date, timeStr: string) => {
  if (!timeStr || typeof timeStr !== 'string') throw new Error('Invalid timeStr');
  const [hours, minutes] = timeStr.trim().split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const calculateInstancePoints = (departureTime: Date, points: any[]) => {
  if (!Array.isArray(points)) return [];
  
  return points.map((p) => {
    const pointTime = new Date(departureTime.getTime() + (p.timeOffset || 0) * 60000);
    
    return {
      stationId: p.stationId,
      name: p.name,
      address: p.address,
      time: pointTime,           // Lưu giờ cụ thể vào DB
      surcharge: p.defaultSurcharge || 0 // Chốt giá phụ thu
    };
  });
};

export async function POST(req: Request) {
  try {
    await dbConnect();

    const templates = await TripTemplate.find({ active: true })
      .populate('routeId')
      .lean();

    if (!templates.length) {
      return NextResponse.json({
        success: true,
        message: 'Không có TripTemplate nào đang active'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysToGenerate = 30;
    let createdCount = 0;

    for (const template of templates) {
      if (!template.routeId) continue;

      for (let i = 0; i < daysToGenerate; i++) {
        const tripDate = new Date(today);
        tripDate.setDate(today.getDate() + i);

        // 2. Check ngày chạy trong tuần
        if (
          Array.isArray(template.daysOfWeek) &&
          template.daysOfWeek.length > 0 &&
          !template.daysOfWeek.includes(tripDate.getDay())
        ) {
          continue;
        }

        // 3. Tạo giờ chạy
        const departureTime = createDateFromTime(
          tripDate,
          template.departureTimeStr
        );

        const arrivalTime = new Date(
          departureTime.getTime() + template.durationMinutes * 60000
        );

        // 5. Check trùng chuyến (cùng xe + cùng ngày + cùng giờ)
         const exists = await Trip.exists({
          busId: template.busId,
          departureTime: {
            $gte: new Date(departureTime.getTime() - 5 * 60000),
            $lte: new Date(departureTime.getTime() + 5 * 60000)
          },
          status: { $ne: 'cancelled' }
        });
        if (exists) continue;

        // 4. Pickup / Dropoff
        const pickupPoints =
          template.pickupPoints?.length > 0
            ? template.pickupPoints
            : template.routeId.defaultPickupPoints ?? [];

        const dropoffPoints =
          template.dropoffPoints?.length > 0
            ? template.dropoffPoints
            : template.routeId.defaultDropoffPoints ?? [];
 
        const finalPickupPoints = calculateInstancePoints(departureTime, pickupPoints);
        const finalDropoffPoints = calculateInstancePoints(departureTime, dropoffPoints);

        const bus = await Bus.findById(template.busId).lean();
        if (!bus) continue;

        const seatsStatus = generateSeatsStatus(bus.seatLayout);

        // 6. Tạo Trip
        await Trip.create({
          companyId: template.companyId,
          routeId: template.routeId._id,
          busId: template.busId,
          driverId: template.driverId,
          departureTime,
          arrivalTime,
          basePrice: template.basePrice,
          pickupPoints: finalPickupPoints,
          dropoffPoints: finalDropoffPoints,
          status: 'scheduled',
          seatsStatus,
        });

        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã sinh ${createdCount} chuyến mới cho ${daysToGenerate} ngày tới`
    });
  } catch (error: any) {
    console.error('Generate trips error:', error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Server error'
      },
      { status: 500 }
    );
  }
}