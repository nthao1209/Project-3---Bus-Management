import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import os from 'os';
import 'dotenv/config';
import { dbConnect } from './lib/dbConnect.js';
import { Trip, Settings, Booking } from './models/models.js';
import { validateEnvOrExit } from './lib/validateEnv.js';
import * as cron from 'node-cron';
validateEnvOrExit();
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
let serverInstance = null;
export const initSocketServer = (srv) => {
    if (global.io) {
        console.log('Reusing existing Socket.IO instance');
        return global.io;
    }
    const serverToUse = srv || serverInstance;
    if (!serverToUse) {
        throw new Error('No HTTP server available to attach Socket.IO');
    }
    const defaultProdOrigin = 'httpts://project-3-bus-management.vercel.app';
    const socketOrigin = process.env.SOCKET_ORIGIN || process.env.SOCKET_ORIGIN || (dev ? '*' : defaultProdOrigin);
    const corsOptions = { origin: socketOrigin, methods: ['GET', 'POST'], credentials: true };
    const ioInstance = new Server(serverToUse, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        cors: corsOptions,
    });
    global.io = ioInstance;
    console.log('Socket.IO instance initialized and set to global');
    return ioInstance;
};
export const getIo = () => global.io;
const HOLD_TIMEOUT = 5 * 60 * 1000;
app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        // Lightweight health endpoint to check server + socket readiness
        try {
            const pathname = parsedUrl.pathname || '';
            if (pathname === '/health' || pathname === '/api/health') {
                const ioReady = !!global.io;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true, socketReady: ioReady, time: new Date().toISOString() }));
                return;
            }
        }
        catch (e) {
            // ignore and continue to Next handler
        }
        handle(req, res, parsedUrl);
    });
    serverInstance = server;
    const io = initSocketServer(server);
    const getSeatData = (trip, seatCode) => {
        if (!trip.seatsStatus)
            return null;
        if (typeof trip.seatsStatus.get === 'function') {
            return trip.seatsStatus.get(seatCode);
        }
        return trip.seatsStatus[seatCode];
    };
    const setSeatData = (trip, seatCode, data) => {
        if (!trip.seatsStatus)
            trip.seatsStatus = new Map();
        if (typeof trip.seatsStatus.set === 'function') {
            trip.seatsStatus.set(seatCode, data);
        }
        else {
            trip.seatsStatus[seatCode] = data;
        }
    };
    const sendNewBookingNotification = async (bookingData) => {
        try {
            await dbConnect();
            const booking = await Booking.findById(bookingData._id || bookingData.bookingId)
                .populate({
                path: 'tripId',
                populate: { path: 'companyId' }
            })
                .populate('userId', 'name email');
            if (!booking || !booking.tripId) {
                console.error('Booking or trip not found:', bookingData);
                return;
            }
            const trip = booking.tripId;
            const companyId = trip.companyId?._id || trip.companyId;
            if (!companyId) {
                console.error('Company ID not found for booking:', booking._id);
                return;
            }
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
            console.log(` Sending new_booking notification to company_${companyId}`, notificationData);
            io.to(`company_${companyId}`).emit('new_booking', notificationData);
            if (booking.userId) {
                const userId = booking.userId._id || booking.userId;
                io.to(`user_${userId}`).emit('booking_confirmed', {
                    bookingId: booking._id,
                    status: booking.status,
                    message: 'Đơn hàng của bạn đã được xác nhận'
                });
            }
        }
        catch (error) {
            console.error('Error sending new booking notification:', error);
        }
    };
    const sendBookingUpdatedNotification = async (bookingData) => {
        try {
            await dbConnect();
            const booking = await Booking.findById(bookingData._id || bookingData.bookingId)
                .populate({
                path: 'tripId',
                populate: { path: 'companyId' }
            });
            if (!booking || !booking.tripId) {
                console.error('Booking or trip not found for update:', bookingData);
                return;
            }
            const trip = booking.tripId;
            const companyId = trip.companyId?._id || trip.companyId;
            if (!companyId) {
                console.error('Company ID not found for booking update:', booking._id);
                return;
            }
            const notificationData = {
                bookingId: booking._id,
                companyId: companyId.toString(),
                customerName: booking.customerInfo?.name || 'Khách hàng',
                amount: booking.totalPrice || 0,
                status: booking.status,
                updatedAt: booking.updatedAt,
                type: 'booking_updated'
            };
            console.log(` Sending booking_updated notification to company_${companyId}`, notificationData);
            io.to(`company_${companyId}`).emit('booking_updated', notificationData);
        }
        catch (error) {
            console.error('Error sending booking updated notification:', error);
        }
    };
    // ==================== SOCKET EVENT HANDLERS ====================
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        /**
         * 1. Join phòng theo trip
         */
        socket.on('join_trip', async (tripId) => {
            socket.join(tripId);
            await dbConnect();
            const trip = await Trip.findById(tripId).lean();
            if (!trip)
                return;
            socket.emit('sync_seat_status', trip.seatsStatus || {});
        });
        /**
         * Join user room for realtime personal notifications
         * Room name: `user_{userId}`
         */
        socket.on('join_user', (userId) => {
            try {
                const room = `user_${userId}`;
                socket.join(room);
                console.log(`Socket ${socket.id} joined user room: ${room}`);
                socket.emit('joined_user', { room, userId });
            }
            catch (err) {
                console.error('join_user error:', err);
            }
        });
        /**
         * Join company dashboard room for real-time updates
         */
        socket.on('join_company_dashboard', (companyId) => {
            const roomName = `company_${companyId}`;
            socket.join(roomName);
            console.log(`Dashboard socket ${socket.id} joined room: ${roomName}`);
            socket.emit('joined_dashboard', { roomName, companyId });
        });
        /**
         * Event: new_booking (từ admin/owner khi tạo booking tại quầy)
         */
        socket.on('new_booking', async (bookingData) => {
            console.log('Received new_booking event:', bookingData);
            await sendNewBookingNotification(bookingData);
        });
        /**
         * Event: booking_updated (khi booking thay đổi trạng thái)
         */
        socket.on('booking_updated', async (bookingData) => {
            console.log('Received booking_updated event:', bookingData);
            await sendBookingUpdatedNotification(bookingData);
        });
        // -----------------------------------------------------------
        // 1. HOLD SEAT
        // -----------------------------------------------------------
        socket.on('hold_seat', async ({ tripId, seatCode }) => {
            try {
                await dbConnect();
                const now = new Date();
                const expireAt = new Date(Date.now() + HOLD_TIMEOUT);
                const trip = await Trip.findById(tripId);
                if (!trip)
                    return;
                // Lấy thông tin ghế hiện tại
                const currentSeat = getSeatData(trip, seatCode);
                console.log(`[HOLD_REQ] Ghế ${seatCode} | User: ${socket.id}`);
                let canHold = false;
                // Logic kiểm tra
                if (!currentSeat || !currentSeat.status || currentSeat.status === 'available') {
                    canHold = true; // Ghế trống
                }
                else if (currentSeat.status === 'holding') {
                    // Nếu ghế đang giữ, kiểm tra xem có hết hạn chưa
                    const isExpired = currentSeat.holdExpireAt && new Date(currentSeat.holdExpireAt) < now;
                    // HOẶC nếu chính là socket này đang giữ (Cho phép giữ lại/gia hạn)
                    const isMySeat = currentSeat.socketId === socket.id;
                    if (isExpired || isMySeat) {
                        canHold = true;
                    }
                }
                if (!canHold) {
                    console.log(`[HOLD_FAIL] Ghế đang được giữ bởi ${currentSeat?.socketId}`);
                    socket.emit('error_message', `Ghế ${seatCode} đã được người khác giữ.`);
                    return;
                }
                // Cập nhật DB (Dùng .set vì là Map)
                const newStatus = {
                    status: 'holding',
                    socketId: socket.id,
                    holdExpireAt: expireAt
                };
                setSeatData(trip, seatCode, newStatus);
                // Với Map, đôi khi cần markModified để chắc chắn
                trip.markModified('seatsStatus');
                await trip.save();
                console.log(`[HOLD_OK] Đã giữ ghế ${seatCode}`);
                io.to(tripId).emit('seat_held', {
                    seatCode,
                    socketId: socket.id,
                    holdExpireAt: expireAt,
                });
            }
            catch (err) {
                console.error('hold_seat error:', err);
            }
        });
        // -----------------------------------------------------------
        // 2. RELEASE SEAT
        // -----------------------------------------------------------
        socket.on('release_seat', async ({ tripId, seatCode }) => {
            try {
                await dbConnect();
                const trip = await Trip.findById(tripId);
                if (!trip)
                    return;
                const currentSeat = getSeatData(trip, seatCode);
                console.log(`[RELEASE_REQ] Ghế ${seatCode} | User: ${socket.id}`);
                // Chỉ cho phép nhả nếu Socket ID khớp
                if (currentSeat && currentSeat.socketId === socket.id) {
                    // Set về available
                    setSeatData(trip, seatCode, { status: 'available' });
                    trip.markModified('seatsStatus');
                    await trip.save();
                    console.log(`[RELEASE_OK] Đã trả ghế ${seatCode}`);
                    // Bắn sự kiện trả ghế
                    io.to(tripId).emit('seat_released', { seatCode, socketId: socket.id });
                }
                else {
                    console.log(`[RELEASE_FAIL] Không phải chủ ghế. DB: ${currentSeat?.socketId}`);
                    // Nếu client hiển thị sai, ép sync lại
                    socket.emit('seat_released', { seatCode, socketId: 'force_sync' });
                }
            }
            catch (err) {
                console.error('release_seat error:', err);
            }
        });
        /**
         * DISCONNECT → TỰ ĐỘNG TRẢ GHẾ
         */
        socket.on('disconnect', async () => {
            console.log('Client disconnected:', socket.id);
            try {
                await dbConnect();
                // 1. Tìm tất cả các chuyến đi mà trong seatsStatus có chứa socketId này
                const trips = await Trip.find({});
                for (const trip of trips) {
                    if (!trip.seatsStatus)
                        continue;
                    let isModified = false;
                    // Duyệt qua Map seatsStatus
                    if (typeof trip.seatsStatus.forEach === 'function') {
                        // Nếu là Map
                        trip.seatsStatus.forEach((val, key) => {
                            if (val.socketId === socket.id && val.status === 'holding') {
                                trip.seatsStatus.set(key, { status: 'available' });
                                io.to(trip._id.toString()).emit('seat_released', { seatCode: key, socketId: socket.id });
                                isModified = true;
                            }
                        });
                    }
                    else {
                        // Nếu là Object (fallback)
                        Object.keys(trip.seatsStatus).forEach(key => {
                            if (trip.seatsStatus[key].socketId === socket.id && trip.seatsStatus[key].status === 'holding') {
                                trip.seatsStatus[key] = { status: 'available' };
                                io.to(trip._id.toString()).emit('seat_released', { seatCode: key, socketId: socket.id });
                                isModified = true;
                            }
                        });
                    }
                    if (isModified) {
                        trip.markModified('seatsStatus');
                        await trip.save();
                        console.log(`Cleaned up seats for user ${socket.id} in trip ${trip._id}`);
                    }
                }
            }
            catch (err) {
                console.error('disconnect cleanup error:', err);
            }
        });
    });
    // ==================== CRON JOB ====================
    let cronTask = null;
    const startCronJob = async () => {
        try {
            await dbConnect();
            const setting = await Settings.findOne({ key: 'notification_cron_schedule' });
            const schedule = setting?.value || '*/5 * * * *';
            if (cronTask) {
                cronTask.stop();
                cronTask = null;
            }
            cronTask = cron.schedule(schedule, async () => {
                try {
                    console.log('Running trip reminder cron job');
                    const response = await fetch('http://localhost:3000/api/cron/send-trip-reminders', {
                        method: 'POST',
                    });
                    if (response.ok) {
                        console.log(' Trip reminders sent');
                    }
                    else {
                        console.error(' Failed to send trip reminders');
                    }
                }
                catch (error) {
                    console.error('Cron job error:', error);
                }
            });
            console.log(`Cron job started with schedule: ${schedule}`);
        }
        catch (error) {
            console.error('Failed to start cron job:', error);
        }
    };
    startCronJob();
    io.on('connection', (socket) => {
        socket.on('reload_cron_schedule', () => {
            console.log('Reloading cron schedule...');
            startCronJob();
        });
    });
    const PORT = Number(process.env.PORT) || 3000;
    server.listen(PORT, '0.0.0.0', () => {
        const displayHost = process.env.NEXT_PUBLIC_HOSTNAME || 'localhost';
        console.log(`Server ready at http://${displayHost}:${PORT} (bind: 0.0.0.0:${PORT})`);
        // Also log local LAN IPs for convenience
        try {
            const nets = os.networkInterfaces();
            const ips = [];
            Object.values(nets).forEach(ifaces => {
                if (!ifaces)
                    return;
                ifaces.forEach(iface => {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        ips.push(iface.address);
                    }
                });
            });
            if (ips.length) {
                ips.forEach(ip => console.log(`Accessible on LAN: http://${ip}:${PORT}`));
            }
        }
        catch (e) {
            // ignore
        }
        // Client socket origin is configured via SOCKET_ORIGIN / SOCKET_ORIGIN
    });
});
