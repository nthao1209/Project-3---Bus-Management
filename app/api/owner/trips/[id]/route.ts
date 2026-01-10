import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

type RouteParams = {
  params: Promise<{ id: string }>;
};


const calculateTripPoints = (baseDate: Date, points: any[]) => {
  if (!Array.isArray(points)) return [];
  
  const validPoints = points.filter(p => p && p.name && p.name.trim() !== '');

  return validPoints.map(p => {
   
    const offset = Number(p.timeOffset) || 0;
    const pointTime = new Date(baseDate.getTime() + offset * 60000);

    let safeStationId = p.stationId;
    if (!safeStationId || safeStationId === '') safeStationId = null;

    return {
      stationId: safeStationId,
      name: p.name,
      address: p.address || '',
      time: pointTime,
      surcharge: Number(p.defaultSurcharge) || Number(p.surcharge) || 0
    };
  });
};

export async function GET(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const trip = await Trip.findById(id)
      .populate('busId', 'plateNumber type seatLayout')
      .populate('routeId', 'name defaultPickupPoints')
      .populate('driverId', 'name phone');

    if (!trip) return NextResponse.json({ message: 'Không tìm thấy chuyến đi' }, { status: 404 });

    const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    
    const tripObj = trip.toObject();
    
    const enrichPointsWithOffset = (points: any[], depTime: Date) => {
      return points.map(p => {
        if (p.time && depTime) {
          const diffMs = new Date(p.time).getTime() - new Date(depTime).getTime();
          p.timeOffset = Math.round(diffMs / 60000); 
        } else {
          p.timeOffset = 0;
        }
        return p;
      });
    };

    tripObj.pickupPoints = enrichPointsWithOffset(tripObj.pickupPoints, trip.departureTime);
    tripObj.dropoffPoints = enrichPointsWithOffset(tripObj.dropoffPoints, trip.departureTime); // Dropoff thường tính offset theo departureTime hoặc arrivalTime tùy logic của bạn (ở đây đang tính theo departureTime cho đồng bộ)

    return NextResponse.json({ success: true, data: tripObj });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; 
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const body = await req.json();
    const ALLOWED_STATUS = ['scheduled', 'running', 'completed', 'cancelled'];

    const trip = await Trip.findById(id);
    
    if (!trip) return NextResponse.json({ message: 'Không tìm thấy chuyến đi' }, { status: 404 });

    const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền sửa' }, { status: 403 });

    
    let newDepartureTime = trip.departureTime;
    
    if (body.departureTime) {
      newDepartureTime = new Date(body.departureTime);
      
      if (isNaN(newDepartureTime.getTime())) {
        return NextResponse.json({ message: 'Giờ khởi hành lỗi' }, { status: 400 });
      }
    }

    let newArrivalTime = trip.arrivalTime;
    if (body.arrivalTime) {
      newArrivalTime = new Date(body.arrivalTime);
      if (isNaN(newArrivalTime.getTime())) {
        return NextResponse.json({ message: 'Giờ đến lỗi' }, { status: 400 });
      }
    }
    
    if (newArrivalTime.getTime() <= newDepartureTime.getTime()) {
      return NextResponse.json(
        { message: 'Giờ đến phải lớn hơn giờ khởi hành' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (body.departureTime) updateData.departureTime = newDepartureTime;
    if (body.arrivalTime) updateData.arrivalTime = newArrivalTime;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
    if (body.driverId !== undefined) updateData.driverId = body.driverId;
    if (body.busId !== undefined) updateData.busId = body.busId;

    if (body.status) {
      if (!ALLOWED_STATUS.includes(body.status)) {
        return NextResponse.json(
          { message: 'Trạng thái không hợp lệ' },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.pickupPoints && Array.isArray(body.pickupPoints)) {
      updateData.pickupPoints = calculateTripPoints(newDepartureTime, body.pickupPoints);
    } else if (body.departureTime) {
      const timeDiff = newDepartureTime.getTime() - new Date(trip.departureTime).getTime();
      if (timeDiff !== 0) {
        updateData.pickupPoints = trip.pickupPoints.map((p: any) => ({
          stationId: p.stationId,
          name: p.name,
          address: p.address,
          surcharge: p.surcharge,
          time: new Date(new Date(p.time).getTime() + timeDiff) 
        }));
      }
    }

    if (body.dropoffPoints && Array.isArray(body.dropoffPoints)) {
       updateData.dropoffPoints = calculateTripPoints(newDepartureTime, body.dropoffPoints);
       
    } else if (body.departureTime) {
      const timeDiff = newDepartureTime.getTime() - new Date(trip.departureTime).getTime();
      if (timeDiff !== 0) {
        updateData.dropoffPoints = trip.dropoffPoints.map((p: any) => ({
          stationId: p.stationId,
          name: p.name,
          address: p.address,
          surcharge: p.surcharge,
          time: new Date(new Date(p.time).getTime() + timeDiff)
        }));
      }
    }

    const updatedTrip = await Trip.findByIdAndUpdate(id, updateData, { new: true });

    return NextResponse.json({ success: true, data: updatedTrip });
  } catch (error: any) {
    console.error("Update Trip Error:", error);
    return NextResponse.json({ message: 'Lỗi cập nhật', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params; 
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const trip = await Trip.findById(id);
    if (!trip) return NextResponse.json({ message: 'Không tìm thấy chuyến đi' }, { status: 404 });

    const isOwner = await Company.exists({ _id: trip.companyId, ownerId: session.userId });
    if (!isOwner) return NextResponse.json({ message: 'Không có quyền xóa' }, { status: 403 });

    await trip.deleteOne();
    return NextResponse.json({ success: true, message: 'Đã xóa chuyến đi' });
  } catch (error: any) {
    return NextResponse.json({ message: 'Lỗi xóa', error: error.message }, { status: 500 });
  }
}