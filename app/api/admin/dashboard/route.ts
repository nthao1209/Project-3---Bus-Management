import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { User, Company, Booking, Trip } from '@/models/models';

export async function GET() {
  try {
    await dbConnect();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 6); 
    startDate.setHours(0, 0, 0, 0); 

    const [userCount, companyCount, tripCount, totalRevenueResult, dailyRevenueResult] = await Promise.all([
      User.countDocuments(),
      Company.countDocuments(),
      Trip.countDocuments(),
      
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]),

      Booking.aggregate([
        { 
          $match: { 
            status: 'confirmed',
            createdAt: { $gte: startDate, $lte: endDate }
          } 
        },
        { 
          $group: { 
           
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+07:00" } },
            dailyTotal: { $sum: '$totalPrice' } 
          } 
        }
      ])
    ]);

    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    const revenueChart = [];
    const revenueMap = new Map();

    dailyRevenueResult.forEach((item: any) => {
      revenueMap.set(item._id, item.dailyTotal);
    });

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]; 
      
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;

      revenueChart.push({
        date: formattedDate,
        revenue: revenueMap.get(formattedDate) || 0 
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalUsers: userCount,
        totalCompanies: companyCount,
        totalTrips: tripCount,
        revenueChart 
      }
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ message: 'Lỗi server', error: error.message }, { status: 500 });
  }
}