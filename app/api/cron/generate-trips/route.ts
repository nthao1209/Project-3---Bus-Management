import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Trip, TripTemplate } from '@/models/models';

// Hàm hỗ trợ tạo Date từ chuỗi giờ
const createDateFromTime = (date: Date, timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

// API này có thể được gọi thủ công bởi Owner (nút "Sinh lịch tháng sau")
// Hoặc gọi tự động bởi Cron Job
export async function POST(req: Request) {
  try {
    await dbConnect();
    
    // 1. Lấy tất cả Template đang active
    const templates = await TripTemplate.find({ active: true });
    
    let createdCount = 0;
    const today = new Date();
    const daysToGenerate = 30; // Sinh trước cho 30 ngày tới

    for (const template of templates) {
      for (let i = 0; i < daysToGenerate; i++) {
        // Tính ngày tương lai
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        
        // Kiểm tra xem ngày này có nằm trong lịch chạy không (Thứ 2, 3...)
        // template.daysOfWeek = [0, 6] (Chủ nhật, Thứ 7). futureDate.getDay() trả về 0-6
        if (template.daysOfWeek.length > 0 && !template.daysOfWeek.includes(futureDate.getDay())) {
          continue; // Bỏ qua nếu không đúng lịch
        }

        // Tạo Departure Time & Arrival Time
        const departureTime = createDateFromTime(futureDate, template.departureTimeStr);
        const arrivalTime = new Date(departureTime.getTime() + template.durationMinutes * 60000);

        // QUAN TRỌNG: Kiểm tra xem chuyến này đã được tạo chưa để tránh trùng lặp
        // Kiểm tra cùng xe, cùng giờ khởi hành
        const exists = await Trip.exists({
          busId: template.busId,
          departureTime: departureTime
        });

        if (!exists) {
          await Trip.create({
            companyId: template.companyId,
            routeId: template.routeId,
            busId: template.busId,
            driverId: template.driverId,
            departureTime: departureTime,
            arrivalTime: arrivalTime,
            basePrice: template.basePrice,
            status: 'scheduled',
            seatsStatus: {}
          });
          createdCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã quét và sinh thêm ${createdCount} chuyến mới cho 30 ngày tới.` 
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}