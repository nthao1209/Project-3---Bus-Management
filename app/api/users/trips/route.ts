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

    //   2. FIND ROUTES
     const routes = await Route.find({
      startStationId: { $in: startStations.map(s => s._id) },
      endStationId: { $in: endStations.map(s => s._id) }
    }).select('_id');

    if (routes.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }


    
    const [y, m, d] = dateStr.split('-').map(Number);
    const VIETNAM_OFFSET_MINUTES = 7 * 60; // +7 hours

    const startOfDayUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - VIETNAM_OFFSET_MINUTES * 60 * 1000);
    const endOfDayUTC = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - VIETNAM_OFFSET_MINUTES * 60 * 1000);

    // Lấy thời gian hiện tại để lọc các chuyến chưa chạy
    const now = new Date();
    
    // Nếu ngày tìm kiếm là hôm nay, chỉ lấy chuyến sau thời điểm hiện tại
    const isToday = 
      y === now.getFullYear() && 
      m === now.getMonth() + 1 && 
      d === now.getDate();
    
    const minDepartureTime = isToday ? now : startOfDayUTC;
    
    console.log('🔍 Search params:', {
      date: dateStr,
      isToday,
      now: now.toISOString(),
      minDepartureTime: minDepartureTime.toISOString(),
      endOfDay: endOfDayUTC.toISOString()
    });
    
    const trips = await Trip.find({
      routeId: { $in: routes.map(r => r._id) },
      departureTime: { 
        $gte: minDepartureTime,  // Chỉ lấy chuyến từ thời điểm hiện tại trở đi
        $lte: endOfDayUTC 
      },
      status: { $in: ['scheduled', 'running'] }
    })
    .populate('companyId', 'name')
    .populate('busId', 'type seatLayout')
    .populate('routeId', 'name durationMinutes')
    .sort({ departureTime: 1 })
    .lean(); 


    const formattedTrips = trips.map(trip => {
      const totalSeats =
        trip.busId?.seatLayout?.totalSeats ?? 40;

      let bookedSeats = 0;
      if (trip.seatsStatus && typeof trip.seatsStatus === 'object') {
        bookedSeats = Object.values(trip.seatsStatus).filter((s: any) => s?.status === 'booked').length;
      }

      return {
        _id: trip._id,
        companyName: trip.companyId?.name,
        busType: trip.busId?.type,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        durationMinutes: trip.routeId?.durationMinutes,
        basePrice: trip.basePrice,
        availableSeats: Math.max(totalSeats - bookedSeats, 0),
        pickupPoints: (trip.pickupPoints || []).map((p: any) => ({
          id: p._id,
          name: p.name,
          address: p.address,
          time: p.time,
          surcharge: p.surcharge
        })),
        dropoffPoints: (trip.dropoffPoints || []).map((p: any) => ({
          id: p._id,
          name: p.name,
          address: p.address,
          time: p.time,
          surcharge: p.surcharge
        }))
      };
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
