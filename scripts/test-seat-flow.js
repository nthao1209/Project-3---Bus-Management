require('dotenv').config();

const io = require('socket.io-client');
const mongoose = require('mongoose');

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { dbName: 'bus_management' });
  console.log('Connected to MongoDB');

  const trip = await mongoose.connection.db.collection('trips').findOne({});
  if (!trip) {
    console.error('No trip found in DB to test');
    process.exit(1);
  }

  const tripId = trip._id.toString();

  // get a seatCode that is available (not booked)
  let seatCode = null;
  const now = new Date();
  const trySeats = [];
  if (trip.bus && trip.bus.seatLayout && Array.isArray(trip.bus.seatLayout.schema) && trip.bus.seatLayout.schema.length) {
    for (const row of trip.bus.seatLayout.schema) {
      for (const c of row) if (c) trySeats.push(c);
    }
  }
  if (trip.seatsStatus) {
    Object.keys(trip.seatsStatus).forEach(k => { if (!trySeats.includes(k)) trySeats.push(k); });
  }

  for (const c of trySeats) {
    const s = (trip.seatsStatus && trip.seatsStatus[c]) || null;
    const status = s && s.status ? s.status : 'available';
    const expired = s && s.holdExpireAt ? new Date(s.holdExpireAt) < now : false;
    if (status === 'available' || (status === 'holding' && expired)) {
      seatCode = c; break;
    }
  }
  if (!seatCode) {
    // if none available, pick a seat and first forcibly set it to available for test
    seatCode = trySeats.length ? trySeats[0] : '01';
    console.log('No free seat found; forcing seat to available for test:', seatCode);
    await mongoose.connection.db.collection('trips').updateOne({ _id: trip._id }, { $set: { [`seatsStatus.${seatCode}.status`]: 'available' }, $unset: { [`seatsStatus.${seatCode}.socketId`]: '', [`seatsStatus.${seatCode}.holdExpireAt`]: '' } });
  }

  console.log('Testing tripId=', tripId, 'seat=', seatCode);
  console.log('Initial seat status:', trip.seatsStatus && trip.seatsStatus[seatCode]);

  const A = io('http://localhost:3000');
  const B = io('http://localhost:3000');

  A.on('connect', () => { console.log('A connected', A.id); A.emit('join_trip', tripId); });
  B.on('connect', () => { console.log('B connected', B.id); B.emit('join_trip', tripId); });

  A.on('sync_seat_status', (p) => { console.log('A sync_seat_status', Object.keys(p).length); });
  B.on('sync_seat_status', (p) => { console.log('B sync_seat_status', Object.keys(p).length); });

  A.on('seat_held', (p) => { console.log('A seat_held', p); });
  B.on('seat_held', (p) => { console.log('B seat_held', p); });

  A.on('seat_booked', (p) => { console.log('A seat_booked', p); });
  B.on('seat_booked', (p) => { console.log('B seat_booked', p); });

  A.on('seat_released', (p) => { console.log('A seat_released', p); });
  B.on('seat_released', (p) => { console.log('B seat_released', p); });

  A.on('error_message', (m) => { console.log('A error', m); });
  B.on('error_message', (m) => { console.log('B error', m); });

  // wait for both sockets to connect and receive sync
  await Promise.all([
    new Promise((res) => A.on('connect', res)),
    new Promise((res) => B.on('connect', res)),
  ]);

  // also wait for sync_seat_status to ensure join processed
  await Promise.all([
    new Promise((res) => A.on('sync_seat_status', res)),
    new Promise((res) => B.on('sync_seat_status', res)),
  ]);

  console.log('A: holding seat');
  A.emit('hold_seat', { tripId, seatCode });

  // wait a bit then B tries
  await new Promise((res) => setTimeout(res, 800));

  console.log('B: trying to hold same seat');
  B.emit('hold_seat', { tripId, seatCode });

  await new Promise((res) => setTimeout(res, 1500));

  console.log('Simulate payment: mark seat as booked in DB');
  const bookingId = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection('trips').updateOne({ _id: trip._id }, { $set: { [`seatsStatus.${seatCode}.status`]: 'booked', [`seatsStatus.${seatCode}.bookingId`]: bookingId }, $unset: { [`seatsStatus.${seatCode}.socketId`]: '', [`seatsStatus.${seatCode}.holdExpireAt`]: '' } });

  await new Promise((res) => setTimeout(res, 2000));

  console.log('Done; closing sockets');
  A.disconnect(); B.disconnect();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });