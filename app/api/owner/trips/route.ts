import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Company, Route, Bus } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';


const generateSeatsStatus = (seatLayout: any) => {
  const seats: Record<string, any> = {};

  // Log để kiểm tra xem Bus lấy từ DB có dữ liệu không
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

  console.log(`✅ Generated ${Object.keys(seats).length} seats`);
  return seats;
};


const calculateTripPoints = (baseDate: Date, points: any[]) => {
  if (!Array.isArray(points)) return [];
  
  const validPoints = points.filter(p => p && p.name && p.name.trim() !== '');

  return validPoints.map(p => {
    const offset = Number(p.timeOffset) || 0;

    const pointTime = new Date(baseDate.getTime() + offset * 60000);

    let safeStationId = p.stationId;
    if (!safeStationId || safeStationId === '') {
      safeStationId = null;
    }

    return {
      stationId: safeStationId, 
      name: p.name,
      address: p.address || '',
      time: pointTime,      
      surcharge: Number(p.defaultSurcharge) || Number(p.surcharge) || 0 
    };
  });
};

// ================= GET =================
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const companies = await Company.find({ ownerId: session.userId }).select('_id');
    const companyIds = companies.map(c => c._id);

    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get('date');

    let filter: any = { companyId: { $in: companyIds } };

    if (dateFilter) {
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);
      filter.departureTime = { $gte: startOfDay, $lte: endOfDay };
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

// ================= POST =================
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyId,
      routeId,
      busId,
      departureTime, 
      arrivalTime,   
      basePrice,
      pickupPoints,    
      dropoffPoints,   
    } = body;

    if (!departureTime || !arrivalTime) {
      return NextResponse.json({ message: 'Thiếu giờ khởi hành hoặc giờ đến' }, { status: 400 });
    }

    const depDate = new Date(departureTime);
    const arrDate = new Date(arrivalTime);

    if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
      return NextResponse.json({ message: 'Định dạng ngày giờ không hợp lệ' }, { status: 400 });
    }
    // ------------------------------------------

    const company = await Company.findOne({
      _id: companyId,
      ownerId: session.userId
    });
    if (!company) {
      return NextResponse.json({ message: 'Nhà xe không hợp lệ' }, { status: 403 });
    }

    // 2. Kiểm tra Route & Bus
    const route = await Route.findOne({ _id: routeId, companyId });
    const bus = await Bus.findOne({ _id: busId, companyId }).lean();

    if (!route || !bus) {
      return NextResponse.json(
        { message: 'Xe hoặc Tuyến đường không thuộc nhà xe này' },
        { status: 400 }
      );
    }

   
    const finalPickupPoints =
      Array.isArray(pickupPoints) && pickupPoints.length > 0
        ? calculateTripPoints(depDate, pickupPoints)
        : calculateTripPoints(depDate, route.defaultPickupPoints || []);

    
    const finalDropoffPoints =
      Array.isArray(dropoffPoints) && dropoffPoints.length > 0
        ? calculateTripPoints(arrDate, dropoffPoints)
        : calculateTripPoints(arrDate, route.defaultDropoffPoints || []);
    
     const seatsStatus = generateSeatsStatus(bus.seatLayout);

    // 4. Tạo Trip
    const newTrip = await Trip.create({
      companyId,
      routeId,
      busId,
      driverId: body.driverId || null, 
      departureTime: depDate, 
      arrivalTime: arrDate,  
      basePrice: Number(basePrice),
      pickupPoints: finalPickupPoints,
      dropoffPoints: finalDropoffPoints,
      seatsStatus : seatsStatus,
      status: 'scheduled'
    });

    return NextResponse.json(
      { success: true, data: newTrip },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('CREATE TRIP ERROR:', error); // Log lỗi ra terminal để debug
    return NextResponse.json(
      { message: 'Lỗi tạo chuyến đi: ' + error.message },
      { status: 500 }
    );
  }
}