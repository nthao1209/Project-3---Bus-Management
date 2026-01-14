import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Notification } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    
    // Check quyền Admin
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, message, type = 'system' } = await req.json();

    if (!userId || !title || !message) {
      return NextResponse.json({ message: 'Thiếu thông tin' }, { status: 400 });
    }

    // 1. Lưu thông báo vào Database
    const newNotification = await Notification.create({
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date()
    });

    // 2. Gửi Socket Realtime đến đúng User đó
    try {
      const io = (global as any).io;
      if (io) {
        console.log(`📢 Sending notification to user_${userId}`);
        // Gửi sự kiện 'receive_notification' vào room 'user_{userId}'
        io.to(`user_${userId}`).emit('receive_notification', newNotification);
      }
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return NextResponse.json({ success: true, message: 'Đã gửi thông báo' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}