import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Settings } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

// GET: Lấy tất cả settings hoặc một setting cụ thể
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (key) {
      const setting = await Settings.findOne({ key });
      return NextResponse.json({ success: true, data: setting });
    }

    const settings = await Settings.find({});
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('GET settings error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}

// POST: Cập nhật hoặc tạo setting
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { key, value } = await req.json();

    if (!key) {
      return NextResponse.json({ message: 'Key is required' }, { status: 400 });
    }

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, updatedBy: session.userId },
      { upsert: true, new: true }
    );

    // Nếu là cron schedule, trigger reload
    if (key === 'notification_cron_schedule') {
      const io = (global as any).io;
      if (io) {
        io.emit('cron_schedule_updated', { schedule: value });
      }
    }

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    console.error('POST settings error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}
