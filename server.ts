import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import 'dotenv/config';
import { dbConnect } from './lib/dbConnect.ts';
import { Trip } from './models/models.ts';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const HOLD_TIMEOUT = 5 * 60 * 1000; // 5 phút

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log('✅ Client connected:', socket.id);

    /**
     * 1. Join phòng theo trip
     */
    socket.on('join_trip', async (tripId: string) => {
      socket.join(tripId);

      await dbConnect();
      const trip = await Trip.findById(tripId).lean();
      if (!trip) return;

      socket.emit('sync_seat_status', trip.seatsStatus || {});
    });

     // Helper để lấy thông tin ghế từ Map an toàn
    const getSeatData = (trip: any, seatCode: string) => {
        if (!trip.seatsStatus) return null;
        // Kiểm tra nếu là Mongoose Map
        if (typeof trip.seatsStatus.get === 'function') {
            return trip.seatsStatus.get(seatCode);
        }
        // Fallback nếu là object thường (ít khi xảy ra với schema này)
        return trip.seatsStatus[seatCode];
    };

    // Helper để set thông tin ghế vào Map
    const setSeatData = (trip: any, seatCode: string, data: any) => {
        if (!trip.seatsStatus) trip.seatsStatus = new Map();
        
        if (typeof trip.seatsStatus.set === 'function') {
            trip.seatsStatus.set(seatCode, data);
        } else {
            trip.seatsStatus[seatCode] = data;
        }
    };

    // -----------------------------------------------------------
    // 1. HOLD SEAT
    // -----------------------------------------------------------
    socket.on('hold_seat', async ({ tripId, seatCode }) => {
      try {
        await dbConnect();
        const now = new Date();
        const expireAt = new Date(Date.now() + HOLD_TIMEOUT);

        const trip = await Trip.findById(tripId);
        if (!trip) return;

        // Lấy thông tin ghế hiện tại
        const currentSeat = getSeatData(trip, seatCode); // Dùng hàm helper

        console.log(`[HOLD_REQ] Ghế ${seatCode} | User: ${socket.id}`);
        // console.log('[DB_CURRENT]', currentSeat); // Bỏ comment để debug

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

      } catch (err) {
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
        if (!trip) return;

        const currentSeat = getSeatData(trip, seatCode);
        
        console.log(`[RELEASE_REQ] Ghế ${seatCode} | User: ${socket.id}`);
        // console.log(`[DB_CHECK] Socket giữ ghế trong DB: ${currentSeat?.socketId}`);

        // Chỉ cho phép nhả nếu Socket ID khớp
        if (currentSeat && currentSeat.socketId === socket.id) {
            
            // Set về available
            setSeatData(trip, seatCode, { status: 'available' });
            
            trip.markModified('seatsStatus');
            await trip.save();

            console.log(`[RELEASE_OK] Đã trả ghế ${seatCode}`);
            
            // Bắn sự kiện trả ghế
            io.to(tripId).emit('seat_released', { seatCode, socketId: socket.id });

        } else {
            console.log(`[RELEASE_FAIL] Không phải chủ ghế. DB: ${currentSeat?.socketId}`);
            // Nếu client hiển thị sai, ép sync lại
            socket.emit('seat_released', { seatCode, socketId: 'force_sync' });
        }
      } catch (err) {
        console.error('release_seat error:', err);
      }
    });
   
    /**
     * 4. DISCONNECT → TỰ ĐỘNG TRẢ GHẾ
     */
    socket.on('disconnect', async () => {
      console.log('❌ Client disconnected:', socket.id);
      try {
        await dbConnect();

        await Trip.updateMany(
          { 'seatsStatus.socketId': socket.id },
          {
            $set: {
              'seatsStatus.$[seat].status': 'available',
            },
            $unset: {
              'seatsStatus.$[seat].socketId': '',
              'seatsStatus.$[seat].holdExpireAt': '',
            },
          },
          {
            arrayFilters: [{ 'seat.socketId': socket.id }],
          }
        );
      } catch (err) {
        console.error('disconnect cleanup error:', err);
      }
    });
  });

  server.listen(3000, () => {
    console.log('🚀 Server ready at http://localhost:3000');
  });
});
