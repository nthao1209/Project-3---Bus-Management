import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Route, Station } from '@/models/models';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const fromProvince = searchParams.get('fromStation');
    const toProvince = searchParams.get('toStation');
    const dateStr = searchParams.get('date');

    if (!fromProvince || !toProvince || !dateStr) {
      return NextResponse.json(
        { message: 'Thiếu thông tin tìm kiếm' },
        { status: 400 }
      );
    }

    /* =========================
       1. FIND STATIONS
    ========================== */
    const startStations = await Station.find({
      province: { $regex: fromProvince, $options: 'i' }
    }).select('_id');

    const endStations = await Station.find({
      province: { $regex: toProvince, $options: 'i' }
    }).select('_id');

    if (startStations.length === 0 || endStations.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const startStationIds = startStations.map(s => s._id);
    const endStationIds = endStations.map(s => s._id);

    /* =========================
       2. FIND ROUTES
    ========================== */
    const routes = await Route.find({
      startStationId: { $in: startStationIds },
      endStationId: { $in: endStationIds }
    }).select('_id');

    if (routes.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    const routeIds = routes.map(r => r._id);

    /* =========================
       3. FIX DATE (UTC SAFE)
    ========================== */
    const searchDate = new Date(dateStr + 'T00:00:00.000Z');

    const startOfDay = new Date(searchDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(searchDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    /* =========================
       4. FIND TRIPS
    ========================== */
    const trips = await Trip.find({
      routeId: { $in: routeIds },
      departureTime: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['scheduled', 'running'] }
    })
      .populate({
        path: 'companyId',
        select: 'name'
      })
      .populate({
        path: 'busId',
        select: 'type seatLayout'
      })
      .populate({
        path: 'routeId',
        select: 'name durationMinutes'
      })
      .sort({ departureTime: 1 });

    /* =========================
       5. FORMAT RESPONSE
    ========================== */
    const formattedTrips = trips.map(trip => {
      const totalSeats =
        trip.busId?.seatLayout?.totalSeats ?? 40;

      const bookedSeats =
        trip.seatsStatus instanceof Map
          ? trip.seatsStatus.size
          : 0;

      return {
        _id: trip._id,
        companyName: trip.companyId?.name ?? 'Nhà xe',
        busType: trip.busId?.type ?? 'Xe khách',
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        departureStation: fromProvince,
        arrivalStation: toProvince,
        basePrice: trip.basePrice,
        availableSeats: Math.max(totalSeats - bookedSeats, 0)
      };
    });

    /* =========================
       6. DEBUG LOG (RẤT NÊN GIỮ)
    ========================== */
    console.log({
      fromProvince,
      toProvince,
      dateStr,
      startOfDay,
      endOfDay,
      routes: routeIds.length,
      trips: formattedTrips.length
    });

    return NextResponse.json({
      success: true,
      data: formattedTrips
    });

  } catch (error: any) {
    console.error('SEARCH TRIP ERROR:', error);
    return NextResponse.json(
      {
        message: 'Lỗi tìm kiếm chuyến xe',
        error: error.message
      },
      { status: 500 }
    );
  }
}
