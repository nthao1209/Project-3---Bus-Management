import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip } from '@/models/models';
import mongoose from 'mongoose';
import { getCurrentUser } from '@/lib/auth';

const HOLD_TIMEOUT = 5 * 60 * 1000; // 5 phút

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getCurrentUser();
    if (!session) return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });

    const tripId = params.id;
    const body = await req.json();
    const seatCode: string = body.seatCode;
    const action: 'hold' | 'release' | 'toggle' = body.action || 'toggle';

    if (!seatCode) return NextResponse.json({ message: 'Thiếu seatCode' }, { status: 400 });

    await dbConnect();

    const now = new Date();
    const expireAt = new Date(Date.now() + HOLD_TIMEOUT);

    // Helper to identify holder value stored in seatsStatus.socketId for API-held seats
    const holderId = `user:${session.userId}`;

    if (action === 'release') {
      // Release only if held by this user
      const result = await Trip.updateOne(
        {
          _id: new mongoose.Types.ObjectId(tripId),
          [`seatsStatus.${seatCode}.socketId`]: holderId,
        },
        {
          $set: { [`seatsStatus.${seatCode}.status`]: 'available' },
          $unset: { [`seatsStatus.${seatCode}.socketId`]: '', [`seatsStatus.${seatCode}.holdExpireAt`]: '' },
        }
      );

      if (result.modifiedCount > 0) {
        // Broadcast via socket.io if available
        (global as any).io?.to(tripId).emit('seat_released', { seatCode });
        return NextResponse.json({ success: true, action: 'release', seatCode });
      }

      return NextResponse.json({ success: false, message: 'Không thể nhả ghế' }, { status: 400 });
    }

    // For hold/toggle: try to hold atomically (respect expired holds)
    const holdResult = await Trip.updateOne(
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
            socketId: holderId,
            holdExpireAt: expireAt,
          },
        },
      }
    );

    if (holdResult.modifiedCount === 0) {
      // Maybe it's held by same user already -> try to release (toggle)
      const heldByMe = await Trip.findOne({
        _id: new mongoose.Types.ObjectId(tripId),
        [`seatsStatus.${seatCode}.socketId`]: holderId,
      }).lean();

      if (heldByMe) {
        // release it
        const rel = await Trip.updateOne(
          { _id: new mongoose.Types.ObjectId(tripId), [`seatsStatus.${seatCode}.socketId`]: holderId },
          {
            $set: { [`seatsStatus.${seatCode}.status`]: 'available' },
            $unset: { [`seatsStatus.${seatCode}.socketId`]: '', [`seatsStatus.${seatCode}.holdExpireAt`]: '' },
          }
        );

        if (rel.modifiedCount > 0) {
          (global as any).io?.to(tripId).emit('seat_released', { seatCode });
          return NextResponse.json({ success: true, action: 'release', seatCode });
        }
      }

      return NextResponse.json({ success: false, message: 'Ghế đã được giữ hoặc bán bởi người khác' }, { status: 409 });
    }

    // Success hold
    (global as any).io?.to(tripId).emit('seat_held', { seatCode, holderId, holdExpireAt: expireAt });
    return NextResponse.json({ success: true, action: 'hold', seatCode, holdExpireAt: expireAt });
  } catch (error: any) {
    console.error('seat-toggle error:', error);
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}