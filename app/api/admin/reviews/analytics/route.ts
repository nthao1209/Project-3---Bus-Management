import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import { Review, Company } from '@/models/models';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const session = await getCurrentUser();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Gom nhóm Review theo Company để tính điểm trung bình
    const report = await Review.aggregate([
      {
        $group: {
          _id: '$companyId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          lastReviewDate: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'companyInfo'
        }
      },
      { $unwind: '$companyInfo' },
      {
        $project: {
          companyId: '$_id',
          companyName: '$companyInfo.name',
          ownerId: '$companyInfo.ownerId', // Lấy ID chủ xe để gửi thông báo
          avgRating: 1,
          totalReviews: 1,
          lastReviewDate: 1
        }
      },
      { $sort: { avgRating: 1 } } // Xếp từ thấp đến cao để Admin dễ thấy xe tệ
    ]);

    return NextResponse.json({ success: true, data: report });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}