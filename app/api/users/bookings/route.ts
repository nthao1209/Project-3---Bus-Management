import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Booking, Payment } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();

    const body = await req.json();
    // Debug log để xem body gửi lên có đúng không
    console.log("Booking Request Body:", body);

    const {
      tripId,
      seatCodes,
      customerInfo,
      pickupPoint,
      dropoffPoint,
      totalPrice,
      note,
      paymentMethod 
    } = body;

    if (!tripId || !seatCodes?.length) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return NextResponse.json({ message: 'Chuyến đi không tồn tại' }, { status: 404 });
    }

    const getSeat = (code: string) => {
        if (trip.seatsStatus instanceof Map) return trip.seatsStatus.get(code);
        return trip.seatsStatus ? trip.seatsStatus[code] : null;
    };

    for (const code of seatCodes) {
      const seat = getSeat(code);
      
      if (seat && (seat.status === 'booked')) {
         return NextResponse.json({
          message: `Ghế ${code} đã bị người khác đặt mất.`
        }, { status: 409 });
      }
    }

    const isOfficePayment = paymentMethod === 'office';
    const bookingStatus = isOfficePayment ?  'pending_payment':'confirmed';

    const paymentExpireAt = isOfficePayment ? null : new Date(Date.now() + 15 * 60 * 1000);

    const booking = await Booking.create({
      userId: session?.userId || null,
      tripId,
      seatCodes,
      totalPrice,
      customerInfo,
      pickupPoint,
      dropoffPoint,
      note,
      status: bookingStatus,
      paymentMethod: isOfficePayment ? 'offline' : 'vnpay', 
      paymentExpireAt
    });

    await Payment.create({
      bookingId: booking._id,
      userId: session?.userId || null,
      amount: totalPrice,
      method: isOfficePayment ? 'offline' : 'vnpay',
      status: isOfficePayment ? 'pending' : 'pending', 
      createdAt: new Date()
    });

    
    const newSeatStatus = isOfficePayment ? 'booked' : 'booked';

    seatCodes.forEach((code: string) => {
      const seatData = {
        status: newSeatStatus,
        bookingId: booking._id,
        holdExpireAt: paymentExpireAt,
        socketId: null 
      };

      if (trip.seatsStatus instanceof Map) {
        trip.seatsStatus.set(code, seatData);
      } else {
        trip.seatsStatus[code] = seatData;
      }
    });

    trip.markModified('seatsStatus'); 
    await trip.save();

    return NextResponse.json({ success: true, data: booking });

  } catch (err: any) {
    console.error("Booking API Error:", err);
    return NextResponse.json({ message: err.message || 'Lỗi server' }, { status: 500 });
  }
}