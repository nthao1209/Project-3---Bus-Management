'use client';

import React from 'react';
import { Button, Tag } from 'antd';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

interface TripCardProps {
  trip: {
    _id: string;
    companyName: string;
    busType: string;
    departureTime: string;
    arrivalTime: string;
    departureStation: string;
    arrivalStation: string;
    price: number;
    availableSeats: number;
  };
}

export default function TripCard({ trip }: TripCardProps) {
  const router = useRouter();

  const durationMinutes = dayjs(trip.arrivalTime).diff(
  dayjs(trip.departureTime),
  'minute'
);

const durationText = `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60}m`;

  return (
    <div className="bg-white rounded-xl border shadow-sm mb-4 px-6 py-4 hover:shadow-md transition">
      
      <div className="flex items-center justify-between gap-6">
        
        {/* CỘT TRÁI */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800">
            {trip.companyName}
          </h3>

          <p className="text-sm text-gray-500 mt-0.5">
            {trip.busType}
          </p>

          <div className="flex items-center gap-4 mt-3 text-sm">
            <div>
              <b className="text-base">
                {dayjs(trip.departureTime).format('HH:mm')}
              </b>
              <div className="text-gray-500">{trip.departureStation}</div>
            </div>

            <div className="text-gray-400">→</div>

            <div>
              <b className="text-base">
                {dayjs(trip.arrivalTime).format('HH:mm')}
              </b>
              <div className="text-gray-500">{trip.arrivalStation}</div>
            </div>

            <div className="text-gray-400">
              • {durationText}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="text-right min-w-[180px]">
       

          <div className="text-xl font-bold text-blue-600">
            {trip.price.toLocaleString()}đ
          </div>

          <Button
            className="mt-3 bg-[#FFC700] text-black font-bold border-none w-full"
            size="large"
            onClick={() => router.push(`/booking/${trip._id}`)}
          >
            Chọn chuyến
          </Button>
        </div>

      </div>
    </div>
  );
}
