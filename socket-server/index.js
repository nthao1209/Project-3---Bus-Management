import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';
import os from 'os';
import { dbConnect } from '../lib/dbConnect.js';
import { Trip, Booking } from '../models/models.js';

// Config
const PORT = process.env.SOCKET_PORT || process.env.PORT || 4000;
// ALLOWED_ORIGINS can be a comma-separated list, supports wildcard like *.vercel.app
const allowedOriginsRaw = process.env.ALLOWED_ORIGINS || '';
const ALLOWED_ORIGINS = allowedOriginsRaw.split(',').map(s => s.trim()).filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow non-browser connections (server-to-server)
  if (!ALLOWED_ORIGINS.length) return true; // no restriction configured
  if (ALLOWED_ORIGINS.includes('*')) return true;
  // exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // wildcard match like *.vercel.app
  for (const pattern of ALLOWED_ORIGINS) {
    if (pattern.startsWith('*.')) {
      const host = pattern.slice(2);
      try {
        const url = new URL(origin);
        if (url.hostname === host || url.hostname.endsWith(`.${host}`)) return true;
      } catch (e) {
        // origin may not be a full URL, fallback to string match
        if (origin.endsWith(`.${host}`)) return true;
      }
    }
  }
  return false;
};

const httpSrv = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
});

const io = new Server(httpSrv, {
  path: '/socket.io',
  cors: {
    origin: (origin, callback) => {
      try {
        const allowed = isOriginAllowed(origin);
        callback(null, allowed);
      } catch (err) {
        callback(new Error('CORS check failed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const HOLD_TIMEOUT = 5 * 60 * 1000;

const getSeatData = (trip, seatCode) => {
  if (!trip.seatsStatus) return null;
  if (typeof trip.seatsStatus.get === 'function') return trip.seatsStatus.get(seatCode);
  return trip.seatsStatus[seatCode];
};

const setSeatData = (trip, seatCode, data) => {
  if (!trip.seatsStatus) trip.seatsStatus = new Map();
  if (typeof trip.seatsStatus.set === 'function') trip.seatsStatus.set(seatCode, data);
  else trip.seatsStatus[seatCode] = data;
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_trip', async (tripId) => {
    try {
      socket.join(tripId);
      await dbConnect();
      const trip = await Trip.findById(tripId).lean();
      if (!trip) return;
      socket.emit('sync_seat_status', trip.seatsStatus || {});
    } catch (e) { console.error('join_trip error', e); }
  });

  socket.on('join_user', (userId) => {
    const room = `user_${userId}`;
    socket.join(room);
    socket.emit('joined_user', { room, userId });
  });

  socket.on('join_company_dashboard', (companyId) => {
    const room = `company_${companyId}`;
    socket.join(room);
    socket.emit('joined_dashboard', { room, companyId });
  });

  socket.on('new_booking', async (bookingData) => {
    try {
      await dbConnect();
      const booking = await Booking.findById(bookingData._id || bookingData.bookingId)
        .populate({ path: 'tripId', populate: { path: 'companyId' } })
        .populate('userId', 'name email');

      if (!booking || !booking.tripId) return;
      const trip = booking.tripId;
      const companyId = trip.companyId?._id || trip.companyId;
      if (!companyId) return;

      const notificationData = {
        bookingId: booking._id,
        tripId: trip._id,
        companyId: companyId.toString(),
        customerName: booking.customerInfo?.name || 'Khách hàng',
        customerPhone: booking.customerInfo?.phone || '',
        amount: booking.totalPrice || 0,
        seatCodes: booking.seatCodes || [],
        status: booking.status || 'pending_payment',
        createdAt: booking.createdAt,
        routeName: trip.routeId?.name || 'Chuyến đi',
        departureTime: trip.departureTime,
        type: 'new_booking'
      };

      io.to(`company_${companyId}`).emit('new_booking', notificationData);
      if (booking.userId) {
        const userId = booking.userId._id || booking.userId;
        io.to(`user_${userId}`).emit('booking_confirmed', { bookingId: booking._id, status: booking.status });
      }
    } catch (err) { console.error('new_booking handler error', err); }
  });

  socket.on('booking_updated', async (bookingData) => {
    try {
      await dbConnect();
      const booking = await Booking.findById(bookingData._id || bookingData.bookingId)
        .populate({ path: 'tripId', populate: { path: 'companyId' } });
      if (!booking || !booking.tripId) return;
      const trip = booking.tripId;
      const companyId = trip.companyId?._id || trip.companyId;
      if (!companyId) return;
      io.to(`company_${companyId}`).emit('booking_updated', { bookingId: booking._id, companyId: companyId.toString(), status: booking.status });
    } catch (err) { console.error('booking_updated error', err); }
  });

  socket.on('hold_seat', async ({ tripId, seatCode }) => {
    try {
      await dbConnect();
      const now = new Date();
      const expireAt = new Date(Date.now() + HOLD_TIMEOUT);
      const trip = await Trip.findById(tripId);
      if (!trip) return;
      const currentSeat = getSeatData(trip, seatCode);
      let canHold = false;
      if (!currentSeat || !currentSeat.status || currentSeat.status === 'available') canHold = true;
      else if (currentSeat.status === 'holding') {
        const isExpired = currentSeat.holdExpireAt && new Date(currentSeat.holdExpireAt) < now;
        const isMySeat = currentSeat.socketId === socket.id;
        if (isExpired || isMySeat) canHold = true;
      }
      if (!canHold) { socket.emit('error_message', `Ghế ${seatCode} đã được người khác giữ.`); return; }
      const newStatus = { status: 'holding', socketId: socket.id, holdExpireAt: expireAt };
      setSeatData(trip, seatCode, newStatus);
      trip.markModified && trip.markModified('seatsStatus');
      await trip.save();
      io.to(tripId).emit('seat_held', { seatCode, socketId: socket.id, holdExpireAt: expireAt });
    } catch (err) { console.error('hold_seat error', err); }
  });

  socket.on('release_seat', async ({ tripId, seatCode }) => {
    try {
      await dbConnect();
      const trip = await Trip.findById(tripId);
      if (!trip) return;
      const currentSeat = getSeatData(trip, seatCode);
      if (currentSeat && currentSeat.socketId === socket.id) {
        setSeatData(trip, seatCode, { status: 'available' });
        trip.markModified && trip.markModified('seatsStatus');
        await trip.save();
        io.to(tripId).emit('seat_released', { seatCode, socketId: socket.id });
      } else {
        socket.emit('seat_released', { seatCode, socketId: 'force_sync' });
      }
    } catch (err) { console.error('release_seat error', err); }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    try {
      await dbConnect();
      const trips = await Trip.find({});
      for (const trip of trips) {
        if (!trip.seatsStatus) continue;
        let isModified = false;
        if (typeof trip.seatsStatus.forEach === 'function') {
          trip.seatsStatus.forEach((val, key) => {
            if (val.socketId === socket.id && val.status === 'holding') {
              trip.seatsStatus.set(key, { status: 'available' });
              io.to(trip._id.toString()).emit('seat_released', { seatCode: key, socketId: socket.id });
              isModified = true;
            }
          });
        } else {
          Object.keys(trip.seatsStatus).forEach(key => {
            if (trip.seatsStatus[key].socketId === socket.id && trip.seatsStatus[key].status === 'holding') {
              trip.seatsStatus[key] = { status: 'available' };
              io.to(trip._id.toString()).emit('seat_released', { seatCode: key, socketId: socket.id });
              isModified = true;
            }
          });
        }
        if (isModified) { trip.markModified && trip.markModified('seatsStatus'); await trip.save(); }
      }
    } catch (err) { console.error('disconnect cleanup error', err); }
  });
});

httpSrv.listen(PORT, () => {
  console.log(`Socket server listening on port ${PORT}`);
  try {
    const nets = os.networkInterfaces();
    const ips = [];
    Object.values(nets).forEach(ifaces => {
      if (!ifaces) return;
      ifaces.forEach(iface => { if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address); });
    });
    ips.forEach(ip => console.log(`Accessible on LAN: http://${ip}:${PORT}`));
  } catch (e) {}
});
