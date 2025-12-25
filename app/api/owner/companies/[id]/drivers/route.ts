import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { User } from '@/models/models';
import { dbConnect } from '@/lib/dbConnect';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {

  try {
  
    await dbConnect();
   
    const resolvedParams = await params;

    const companyId = resolvedParams.id;

    const isValid = mongoose.isValidObjectId(companyId);

    if (!isValid) {
      console.error('[ERROR] Invalid companyId');
      return NextResponse.json(
        { success: false, message: 'Invalid companyId' },
        { status: 400 }
      );
    }

    const drivers = await User.find({
      companyId,
      role: 'driver',
      isActive: true
    })
      .select('_id name phone')
      .lean();

    return NextResponse.json({
      success: true,
      data: drivers.map((d: any) => ({
        label: `${d.name} - ${d.phone}`,
        value: d._id
      }))
    });
  } catch (error: any) {
    console.error('[SERVER ERROR]', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
