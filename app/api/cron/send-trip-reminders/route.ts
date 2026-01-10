import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, Booking, Notification, User } from '@/models/models';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json().catch(() => ({}));
    const testMode = body.testMode === true; // Admin test mode

    const now = new Date();
    const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
    const in25Min = new Date(now.getTime() + 25 * 60 * 1000);

    // Find trips departing in 25-35 minutes (or all upcoming trips in test mode)
    const filter: any = {
      status: { $in: ['scheduled', 'running'] }
    };

    if (!testMode) {
      filter.departureTime = { $gte: in25Min, $lte: in30Min };
    } else {
      // Test mode: get all trips departing in the next 2 hours
      filter.departureTime = { $gte: now, $lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) };
    }

    const trips = await Trip.find(filter)
    .populate('routeId', 'name')
    .populate('busId', 'plateNumber')
    .populate('driverId', 'name');

    console.log(`[${testMode ? 'TEST MODE' : 'NORMAL'}] Found ${trips.length} trips for reminders`);
    console.log(`Current time: ${now.toLocaleString('vi-VN')}`);
    if (trips.length > 0) {
      console.log(`Trip times: ${trips.map(t => new Date(t.departureTime).toLocaleString('vi-VN')).join(', ')}`);
    }

    let driversNotified = 0;
    let passengersNotified = 0;

    for (const trip of trips) {
      const tripId = trip._id.toString();

      // Check if reminder already sent for this trip in the last 2 hours
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const existingReminder = await Notification.findOne({
        type: 'trip_reminder',
        'data.tripId': tripId,
        createdAt: { $gte: twoHoursAgo }
      });

      if (existingReminder && !testMode) {
        console.log(`Reminder already sent for trip ${tripId} within last 2 hours`);
        continue;
      }

      if (testMode && existingReminder) {
        console.log(`[TEST MODE] Skipping duplicate check for trip ${tripId}`);
      }

      const departureTimeStr = trip.departureTime.toLocaleString('vi-VN');
      const routeName = trip.routeId?.name || 'Chuyến xe';
      const busPlate = trip.busId?.plateNumber || 'Unknown';

      // Send to driver
      if (trip.driverId) {
        const driverNotif = await Notification.create({
          userId: trip.driverId._id,
          title: 'Nhắc nhở chuyến xe',
          message: `Chuyến xe ${routeName} (${busPlate}) khởi hành lúc ${departureTimeStr}. Hãy chuẩn bị!`,
          type: 'trip_reminder',
          data: { tripId },
          isRead: false
        });
        console.log(`Sent reminder to driver ${trip.driverId.name} (userId: ${trip.driverId._id})`);
        driversNotified++;

        // Emit realtime to driver if connected
        try {
          const io = (global as any).io;
          if (io) {
            console.log(`[SOCKET] Emitting to room: user_${trip.driverId._id.toString()}`);
            io.to(`user_${trip.driverId._id.toString()}`).emit('notification', driverNotif);
          } else {
            console.log('[SOCKET] io not available');
          }
        } catch (err) {
          console.error('Emit driver notification error:', err);
        }
      }

      // Send to passengers
      const bookings = await Booking.find({
        tripId: trip._id,
        status: { $in: ['pending', 'confirmed', 'pending_payment'] }
      }).populate('userId', 'name');

      console.log(`Found ${bookings.length} bookings for trip ${tripId}`);

      for (const booking of bookings) {
        if (booking.userId) {
          const pNotif = await Notification.create({
            userId: booking.userId._id,
            title: 'Nhắc nhở chuyến xe',
            message: `Chuyến xe ${routeName} (${busPlate}) của bạn khởi hành lúc ${departureTimeStr}. Hãy chuẩn bị!`,
            type: 'trip_reminder',
            data: { tripId, bookingId: booking._id },
            isRead: false
          });
          console.log(`Sent reminder to passenger ${booking.userId.name} (userId: ${booking.userId._id})`);
          passengersNotified++;

          // Emit realtime to passenger if connected
          try {
            const io = (global as any).io;
            if (io) {
              console.log(`[SOCKET] Emitting to room: user_${booking.userId._id.toString()}`);
              io.to(`user_${booking.userId._id.toString()}`).emit('notification', pNotif);
            } else {
              console.log('[SOCKET] io not available');
            }
          } catch (err) {
            console.error('Emit passenger notification error:', err);
          }
        }
      }
    }

    console.log(`\n📊 Notification Summary:`);
    console.log(`   Trips processed: ${trips.length}`);
    console.log(`   Drivers notified: ${driversNotified}`);
    console.log(`   Passengers notified: ${passengersNotified}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Reminders sent', 
      stats: { 
        tripsFound: trips.length,
        driversNotified,
        passengersNotified
      } 
    });
  } catch (error) {
    console.error('Send trip reminders error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}
