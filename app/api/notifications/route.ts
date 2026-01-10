import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Notification } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const notifications = await Notification.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('GET notifications error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ message: 'Chưa xác thực' }, { status: 401 });
    }

    const { notificationIds } = await req.json();

    if (!Array.isArray(notificationIds)) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds }, userId: session.userId },
      { isRead: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST notifications error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}
