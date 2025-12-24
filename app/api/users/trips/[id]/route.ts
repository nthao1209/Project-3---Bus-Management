import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {Trip} from "@/models/models";
import {dbConnect} from "@/lib/dbConnect";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    await dbConnect();

    const trip = await Trip.findById(id)
      .populate("busId")
      .populate("routeId","defaultPickupPoints defaultDropoffPoints")

    if (!trip) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy chuyến đi" },
        { status: 404 }
      );
    }

     const pickupPoints =
      trip.pickupPoints?.length > 0
        ? trip.pickupPoints
        : trip.routeId?.defaultPickupPoints || [];

    const dropoffPoints =
      trip.dropoffPoints?.length > 0
        ? trip.dropoffPoints
        : trip.routeId?.defaultDropoffPoints || [];

    return NextResponse.json({
      success: true,
      data: {
              ...trip.toObject(),
              pickupPoints,
              dropoffPoints
            }
    });

  } catch (error) {
    console.error("GET trip error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}
