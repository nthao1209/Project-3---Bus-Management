'use client';

import React, { useState } from 'react';
import { Button, message } from 'antd';
import { StarFilled, CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import Image from 'next/image';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

// Import 2 component con
import TripSeatSelection, { SeatUI } from './TripSeatSelection';
import TripLocationSelection from './TripLocationSelection';

interface TripCardProps {
  trip: {
    _id: string;
    companyName: string;
    rating: number;
    ratingCount: number;
    busType: string;
    busImage: string;
    departureTime: string;
    arrivalTime: string;
    departureStation: string;
    arrivalStation: string;
    duration: number;
    price: number;
    availableSeats: number;
  }
}

export default function TripCard({ trip }: TripCardProps) {
  const router = useRouter();

  // State quản lý việc đóng/mở phần đặt vé (Inline)
  const [isExpanded, setIsExpanded] = useState(false);
  const [step, setStep] = useState<'seats' | 'locations'>('seats');
  
  // State lưu dữ liệu
  const [selectedSeats, setSelectedSeats] = useState<SeatUI[]>([]);

  // Toggle đóng mở
  const toggleExpand = () => {
    if (isExpanded) {
      // Nếu đang mở thì đóng lại và reset
      setIsExpanded(false);
      setStep('seats');
      setSelectedSeats([]);
    } else {
      // Nếu đang đóng thì mở ra
      setIsExpanded(true);
    }
  };

  // Callback: Đóng form
  const handleClose = () => {
    setIsExpanded(false);
    setStep('seats');
  };

  // Callback: Xong bước chọn ghế -> Sang bước điểm đón
  const handleSeatsConfirmed = (seats: SeatUI[]) => {
    setSelectedSeats(seats);
    setStep('locations');
    // Scroll nhẹ xuống để user thấy phần chọn điểm đón (tuỳ chọn)
  };

  // Callback: Quay lại chọn ghế
  const handleBackToSeats = () => {
    setStep('seats');
  };

  // Callback: Hoàn tất -> Chuyển trang booking
  const handleLocationsConfirmed = (pickup: any, dropoff: any) => {
    const bookingData = {
        tripId: trip._id,
        tripInfo: trip,
        seats: selectedSeats,
        pickupPoint: pickup,
        dropoffPoint: dropoff,
        totalPrice: selectedSeats.reduce((sum, s) => sum + s.price, 0)
    };
    
    sessionStorage.setItem('booking_data', JSON.stringify(bookingData));
    router.push('/booking');
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-300 overflow-hidden mb-4 ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : 'hover:shadow-md'}`}>
      
      <div className="p-4 flex flex-col sm:flex-row gap-4">
        
        <div className="w-full sm:w-[160px] h-[120px] relative flex-shrink-0 cursor-pointer" onClick={toggleExpand}>
          <Image 
            src={trip.busImage || '/Logo.png'} 
            alt={trip.companyName}
            fill
            className="object-cover rounded-md"
          />
          <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] px-1 rounded">
             Xác nhận ngay
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 cursor-pointer hover:text-blue-600" onClick={toggleExpand}>
                {trip.companyName}
                <span className="flex items-center gap-1 text-sm font-normal text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  <StarFilled className="text-yellow-400" /> {trip.rating} ({trip.ratingCount})
                </span>
              </h3>
              <p className="text-gray-500 text-sm mt-1">{trip.busType} • {trip.availableSeats} chỗ trống</p>
            </div>
            {/* Giá trên Mobile */}
            <div className="sm:hidden text-right">
                <div className="text-blue-600 font-bold text-lg">
                    {trip.price.toLocaleString('vi-VN')}đ
                </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-4 flex items-stretch gap-3" onClick={toggleExpand} style={{cursor: 'pointer'}}>
             <div className="flex flex-col items-center justify-between py-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white"></div>
                <div className="flex-1 w-[1px] border-l border-dashed border-gray-400 my-1"></div>
                <div className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-white"></div>
             </div>

             <div className="flex-1 flex flex-col justify-between h-[80px]">
                <div className="flex items-center gap-2">
                   <span className="text-xl font-bold text-gray-700">
                      {dayjs(trip.departureTime).format('HH:mm')}
                   </span>
                   <span className="text-sm text-gray-500">• {trip.departureStation}</span>
                </div>
                
                <div className="text-xs text-gray-400 pl-1">
                   {Math.floor(trip.duration / 60)}h{trip.duration % 60}m
                </div>

                <div className="flex items-center gap-2">
                   <span className="text-xl font-bold text-gray-700">
                      {dayjs(trip.arrivalTime).format('HH:mm')}
                   </span>
                   <span className="text-sm text-gray-500 flex items-center gap-1">
                      • {trip.arrivalStation} 
                   </span>
                </div>
             </div>
          </div>
        </div>

        <div className="hidden sm:flex flex-col justify-between items-end min-w-[150px] text-right pl-4 border-l border-gray-100">
           <div>
              <div className="text-blue-600 font-bold text-xl">
                 Từ {trip.price.toLocaleString('vi-VN')}đ
              </div>
           </div>

           <div className="flex flex-col gap-2 w-full mt-4">
             <Button 
               onClick={toggleExpand}
               className={`font-bold border-none h-10 text-base ${isExpanded ? 'bg-gray-200 text-gray-600' : '!bg-[#FFC700] text-black'}`}
               type={isExpanded ? 'default' : 'primary'}
            >
               {isExpanded ? 'Đóng lại' : 'Chọn chuyến'}
            </Button>
            <div 
                className="text-xs text-gray-500 text-center cursor-pointer hover:text-blue-600 select-none"
                onClick={toggleExpand}
            >
                {isExpanded ? 'Thu gọn' : 'Thông tin chi tiết'} {isExpanded ? <CaretUpOutlined /> : <CaretDownOutlined />}
            </div>
           </div>
        </div>
      </div>

      {!isExpanded && (
        <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
            <div className="flex gap-4">
               <span className="text-green-600 font-medium">KHÔNG CẦN THANH TOÁN TRƯỚC</span>
            </div>
            <div className="flex gap-2">
               <span className="underline cursor-pointer hover:text-blue-600">Chính sách hủy vé</span>
            </div>
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-gray-200 animate-fadeIn">
            {step === 'seats' && (
                <TripSeatSelection 
                    tripId={trip._id}
                    basePrice={trip.price}
                    onClose={handleClose}
                    onNext={handleSeatsConfirmed}
                />
            )}

            {step === 'locations' && (
                <TripLocationSelection
                    tripId={trip._id}
                    totalPrice={selectedSeats.reduce((sum, s) => sum + s.price, 0)}
                    selectedSeats={selectedSeats.map(s => s.id)}
                    onBack={handleBackToSeats}
                    onClose={handleClose}
                    onNext={handleLocationsConfirmed}
                />
            )}
        </div>
      )}
    </div>
  );
}