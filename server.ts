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

    /**
     * 2. HOLD GHẾ (ATOMIC – CHỐNG GIỮ TRÙNG)
     */
    socket.on('hold_seat', async ({ tripId, seatCode }) => {
      try {
        await dbConnect();

        const now = new Date();
        const expireAt = new Date(Date.now() + HOLD_TIMEOUT);

        const result = await Trip.updateOne(
          {
            _id: new mongoose.Types.ObjectId(tripId),
            $or: [
              { [`seatsStatus.${seatCode}`]: { $exists: false } },
              { [`seatsStatus.${seatCode}.status`]: 'available' },
              {
                $and: [
                  { [`seatsStatus.${seatCode}.status`]: 'holding' },
                  { [`seatsStatus.${seatCode}.holdExpireAt`]: { $lt: now } },
                ],
              },
            ],
          },
          {
            $set: {
              [`seatsStatus.${seatCode}`]: {
                status: 'holding',
                socketId: socket.id,
                holdExpireAt: expireAt,
              },
            },
          }
        );

        if (result.modifiedCount === 0) {
          socket.emit(
            'error_message',
            `Ghế ${seatCode} đã được người khác giữ hoặc đã bán`
          );
          return;
        }

        io.to(tripId).emit('seat_held', {
          seatCode,
          socketId: socket.id,
          holdExpireAt: expireAt,
        });
      } catch (err) {
        console.error('hold_seat error:', err);
      }
    });

    /**
     * 3. RELEASE GHẾ (NGƯỜI GIỮ MỚI ĐƯỢC NHẢ)
     */
    socket.on('release_seat', async ({ tripId, seatCode }) => {
      try {
        await dbConnect();

        const result = await Trip.updateOne(
          {
            _id: tripId,
            [`seatsStatus.${seatCode}.socketId`]: socket.id,
          },
          {
            $set: {
              [`seatsStatus.${seatCode}.status`]: 'available',
            },
            $unset: {
              [`seatsStatus.${seatCode}.socketId`]: '',
              [`seatsStatus.${seatCode}.holdExpireAt`]: '',
            },
          }
        );

        if (result.modifiedCount > 0) {
          io.to(tripId).emit('seat_released', { seatCode });
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
