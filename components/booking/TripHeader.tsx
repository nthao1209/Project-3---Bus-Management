"use client";

import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

interface TripHeaderProps {
  trip: any;
  step: number;
  setStep: (step: number) => void;
}

export default function TripHeader({ trip, step, setStep }: TripHeaderProps) {
  const router = useRouter();

  return (
    <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => step === 1 ? router.back() : setStep(1)} 
          type="text" 
        />
        <div>
          <h1 className="text-lg font-bold m-0 leading-tight">
            {trip.route?.name || trip.routeId?.name}
          </h1>
          <span className="text-sm text-gray-500">
            {dayjs(trip.departureTime).format('DD/MM/YYYY')} • {trip.bus?.plateNumber || trip.busId?.plateNumber}
          </span>
        </div>
      </div>
    </div>
  );
}
