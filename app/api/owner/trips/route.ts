import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Company, Route, Bus } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

/**
 * Helper: Tính toán an toàn
 * Fix lỗi:
 * 1. Lọc bỏ điểm không có tên
 * 2. Chuyển đổi stationId rỗng thành null
 * 3. Đảm bảo timeOffset và Surcharge là số
 */
const calculateTripPoints = (baseDate: Date, points: any[]) => {
  if (!Array.isArray(points)) return [];
  
  // 1. Lọc các điểm rác (không có tên)
  const validPoints = points.filter(p => p && p.name && p.name.trim() !== '');

  return validPoints.map(p => {
    const offset = Number(p.timeOffset) || 0;

    // 2. Tính toán thời gian (baseDate phải là Date object)
    const pointTime = new Date(baseDate.getTime() + offset * 60000);

    // 3. Xử lý StationId: Tránh lỗi CastError nếu gửi lên chuỗi rỗng ""
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
      departureTime, // Đây là STRING
      arrivalTime,   // Đây là STRING
      basePrice,
      pickupPoints,    
      dropoffPoints   
    } = body;

    // --- VALIDATION & CONVERSION QUAN TRỌNG ---
    if (!departureTime || !arrivalTime) {
      return NextResponse.json({ message: 'Thiếu giờ khởi hành hoặc giờ đến' }, { status: 400 });
    }

    // Chuyển String thành Date Object để hàm getTime() hoạt động
    const depDate = new Date(departureTime);
    const arrDate = new Date(arrivalTime);

    if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
      return NextResponse.json({ message: 'Định dạng ngày giờ không hợp lệ' }, { status: 400 });
    }
    // ------------------------------------------

    // 1. Kiểm tra Company
    const company = await Company.findOne({
      _id: companyId,
      ownerId: session.userId
    });
    if (!company) {
      return NextResponse.json({ message: 'Nhà xe không hợp lệ' }, { status: 403 });
    }

    // 2. Kiểm tra Route & Bus
    const route = await Route.findOne({ _id: routeId, companyId });
    const bus = await Bus.findOne({ _id: busId, companyId });

    if (!route || !bus) {
      return NextResponse.json(
        { message: 'Xe hoặc Tuyến đường không thuộc nhà xe này' },
        { status: 400 }
      );
    }

    // 3. Tính toán Points (Truyền vào Date Object đã convert)
    // Pickup tính theo giờ khởi hành
    const finalPickupPoints =
      Array.isArray(pickupPoints) && pickupPoints.length > 0
        ? calculateTripPoints(depDate, pickupPoints)
        : calculateTripPoints(depDate, route.defaultPickupPoints || []);

    // Dropoff tính theo giờ khởi hành (thường offset tính từ lúc xuất bến)
    // LƯU Ý: Nếu offset dropoff của bạn tính từ "Lúc đến" thì dùng arrDate, 
    // còn nếu tính từ "Lúc đi" (VD: điểm trả sau 4 tiếng kể từ lúc đi) thì dùng depDate.
    // Ở đây tôi giữ nguyên logic của bạn là dùng arrDate (nếu offset=0 nghĩa là trả lúc đến bến cuối)
    const finalDropoffPoints =
      Array.isArray(dropoffPoints) && dropoffPoints.length > 0
        ? calculateTripPoints(arrDate, dropoffPoints)
        : calculateTripPoints(arrDate, route.defaultDropoffPoints || []);

    // 4. Tạo Trip
    const newTrip = await Trip.create({
      companyId,
      routeId,
      busId,
      driverId: body.driverId || null, // Xử lý driver optional
      departureTime: depDate, // Lưu Date Object
      arrivalTime: arrDate,   // Lưu Date Object
      basePrice: Number(basePrice),
      pickupPoints: finalPickupPoints,
      dropoffPoints: finalDropoffPoints,
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