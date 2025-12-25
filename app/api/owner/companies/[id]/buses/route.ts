import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Bus } from '@/models/models';
import { dbConnect } from '@/lib/dbConnect';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteParams) {

  try {
    
    await dbConnect();

    const resolvedParams = await params;

    const { id: companyId } = resolvedParams;
  
   
    const isValid = mongoose.isValidObjectId(companyId);

    if (!isValid) {
      console.error('[ERROR] Invalid companyId');
      return NextResponse.json(
        { success: false, message: 'Invalid companyId' },
        { status: 400 }
      );
    }

    const buses = await Bus.find({
      companyId,
      status: 'active'
    })
      .select('_id plateNumber type')
      .lean();

    const responseData = buses.map((b: any) => ({
      label: `${b.plateNumber} (${b.type})`,
      value: b._id
    }));

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('[FATAL ERROR]', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
