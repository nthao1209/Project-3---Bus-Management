import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Booking, Payment } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();

    const {
      tripId,
      seatCodes,
      customerInfo,
      pickupPoint,
      dropoffPoint,
      totalPrice,
      note,
      paymentMethod 
    } = await req.json();

    if (!tripId || !seatCodes?.length) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return NextResponse.json({ message: 'Chuyến đi không tồn tại' }, { status: 404 });
    }

    /* ================== 1. KIỂM TRA GHẾ ================== */
    for (const code of seatCodes) {
      const seat = trip.seatsStatus?.[code];
      if (seat && seat.status !== 'available') {
        return NextResponse.json({
          message: `Ghế ${code} đã được đặt`
        }, { status: 409 });
      }
    }

    /* ================== 2. XÁC ĐỊNH TRẠNG THÁI ================== */
    const isOfficePayment = paymentMethod === 'office';

    const bookingStatus = isOfficePayment
      ? 'confirmed'
      : 'pending_payment';

    const paymentExpireAt = isOfficePayment
      ? null
      : new Date(Date.now() + 15 * 60 * 1000);

    /* ================== 3. TẠO BOOKING ================== */
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
      paymentMethod,
      paymentExpireAt
    });
    await Payment.create({
      bookingId: booking._id,
      userId: session?.userId || null,
      amount: totalPrice,
      method: isOfficePayment ? 'offline' : 'vnpay',
      status: isOfficePayment ? 'success' : 'pending',
      createdAt: new Date()
    });
    /* ================== 4. CẬP NHẬT GHẾ ================== */
    const updateQuery: any = {};

    seatCodes.forEach((code: string) => {
      updateQuery[`seatsStatus.${code}.status`] = isOfficePayment
        ? 'booked'
        : 'holding';

      updateQuery[`seatsStatus.${code}.bookingId`] = booking._id;
      updateQuery[`seatsStatus.${code}.holdExpireAt`] = paymentExpireAt;
    });

    await Trip.findByIdAndUpdate(tripId, { $set: updateQuery });

    return NextResponse.json({ success: true, data: booking });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
