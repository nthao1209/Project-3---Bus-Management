import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Booking, Payment } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();

    const body = await req.json();
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
    const bookingStatus = 'pending_payment';

    const paymentExpireAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 giờ cho cả 2 loại

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

    // Create payment and attach a stable transactionId (use booking._id)
    await Payment.create({
      bookingId: booking._id,
      userId: session?.userId || null,
      amount: totalPrice,
      method: isOfficePayment ? 'offline' : 'vnpay',
      status: 'pending',
      transactionId: booking._id.toString(),
      createdAt: new Date()
    });

    
    const newSeatStatus = 'holding';

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

    try {
      const io = (global as any).io;
      
      console.log(' Socket.IO check:', {
        ioAvailable: !!io,
        companyId: trip.companyId,
        tripId: trip._id
      });
      
      if (io && trip.companyId) {
        const roomName = `company_${trip.companyId}`;
        console.log(`Emitting booking_updated to room: ${roomName}`);
        
        const eventData = {
          type: isOfficePayment ? 'office_booking' : 'vnpay_pending',
          bookingId: booking._id,
          amount: totalPrice,
          customerName: customerInfo.name,
          seats: seatCodes,
          status: bookingStatus,
          timestamp: new Date()
        };
        
        io.to(roomName).emit('booking_updated', eventData);
        
        io.to(`trip_${booking.tripId}`).emit('new_booking', {
          bookingId: booking._id,
          seatCodes: booking.seatCodes,
          customerName: booking.customerInfo.name
        });
        
        console.log('✅ Socket event emitted successfully:', eventData);
      } else {
        console.warn('⚠️ Socket.IO not available or no companyId:', {
          ioAvailable: !!io,
          companyId: trip.companyId
        });
      }
    } catch (socketError) {
      console.error('❌ Socket emit error:', socketError);
    }

    return NextResponse.json({ success: true, data: booking });

  } catch (err: any) {
    console.error("Booking API Error:", err);
    return NextResponse.json({ message: err.message || 'Lỗi server' }, { status: 500 });
  }
}
