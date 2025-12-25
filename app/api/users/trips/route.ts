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

      //  1. FIND STATIONS
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


    //   3. FIX DATE (UTC SAFE)
    const searchDate = new Date(dateStr + 'T00:00:00.000Z');

    const startOfDay = new Date(searchDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(searchDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

     //  4. FIND TRIPS
    
    const trips = await Trip.find({
      routeId: { $in: routes.map(r => r._id) },
      departureTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['scheduled', 'running'] }
    })
    .populate('companyId', 'name')
    .populate('busId', 'type seatLayout')
    .populate('routeId', 'name durationMinutes')
    .sort({ departureTime: 1 })
    .lean(); // Dùng lean() để query nhanh hơn

    //  5. FORMAT RESPONSE

    const formattedTrips = trips.map(trip => {
      const totalSeats =
        trip.busId?.seatLayout?.totalSeats ?? 40;

      const bookedSeats = 
        trip.seatsStatus ? Object.keys(trip.seatsStatus).length : 0; 

      return {
        _id: trip._id,
        companyName: trip.companyId?.name,
        busType: trip.busId?.type,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        durationMinutes: trip.routeId?.durationMinutes,
        basePrice: trip.basePrice,
        availableSeats: Math.max(totalSeats - bookedSeats, 0),
        pickupPoints: trip.pickupPoints.map((p: any) => ({
          id: p._id, 
          name: p.name,
          address: p.address,
          time: p.time, 
          surcharge: p.surcharge
        })),
        dropoffPoints: trip.dropoffPoints.map((p: any) => ({
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
