import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, TripTemplate } from '@/models/models';

/**
 * Tạo Date hợp lệ từ ngày + chuỗi HH:mm
 */
const createDateFromTime = (baseDate: Date, timeStr: string) => {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error('departureTimeStr is missing or invalid');
  }

  const cleaned = timeStr.trim(); // rất quan trọng
  const match = cleaned.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    throw new Error(`Invalid time format (HH:mm): ${timeStr}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid Date created from ${timeStr}`);
  }

  return date;
};

/**
 * POST /api/trips/generate
 * Sinh trip từ template (Owner hoặc Cron)
 */
export async function POST(req: Request) {
  try {
    await dbConnect();

    // 1. Lấy template đang active
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

        // 4. Pickup / Dropoff
        const pickupPoints =
          template.pickupPoints?.length > 0
            ? template.pickupPoints
            : template.routeId.defaultPickupPoints ?? [];

        const dropoffPoints =
          template.dropoffPoints?.length > 0
            ? template.dropoffPoints
            : template.routeId.defaultDropoffPoints ?? [];

        // 5. Check trùng chuyến (cùng xe + cùng ngày + cùng giờ)
        const startOfDay = new Date(departureTime);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(departureTime);
        endOfDay.setHours(23, 59, 59, 999);

        const exists = await Trip.exists({
          companyId: template.companyId,
          busId: template.busId,
          departureTime: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        });

        if (exists) continue;

        // 6. Tạo Trip
        await Trip.create({
          companyId: template.companyId,
          routeId: template.routeId._id,
          busId: template.busId,
          driverId: template.driverId,
          departureTime,
          arrivalTime,
          basePrice: template.basePrice,
          pickupPoints,
          dropoffPoints,
          status: 'scheduled',
          seatsStatus: {}
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
