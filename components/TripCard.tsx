'use client';

import React from 'react';
import { Button, Tag, Divider } from 'antd';
import { EnvironmentFilled, StarFilled, CaretDownOutlined } from '@ant-design/icons';
import Image from 'next/image';
import dayjs from 'dayjs';
import TripSeatSelection from './TripSeatSelection';

interface TripCardProps {
  trip: {
    _id: string;
    companyName: string;
    rating: number;
    ratingCount: number;
    busType: string;
    busImage: string;
    departureTime: string; // ISO String
    arrivalTime: string;
    departureStation: string;
    arrivalStation: string;
    duration: number; // Phút
    price: number;
    originalPrice?: number; // Giá gốc để gạch đi (nếu có KM)
    availableSeats: number;
  }
}

export default function TripCard({ trip }: TripCardProps) {

  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden mb-4">
      <div className="p-4 flex flex-col sm:flex-row gap-4">
        
        {/* 1. Hình ảnh xe */}
        <div className="w-full sm:w-[160px] h-[120px] relative flex-shrink-0">
          <Image 
            src={trip.busImage || '/bus-placeholder.jpg'} 
            alt={trip.companyName}
            fill
            className="object-cover rounded-md"
          />
          {/* Badge xác nhận (Option) */}
          <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] px-1 rounded">
             Xác nhận ngay
          </div>
        </div>

        {/* 2. Thông tin chính */}
        <div className="flex-1 flex flex-col justify-between">
          
          {/* Header: Tên nhà xe + Đánh giá */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                {trip.companyName}
                <span className="flex items-center gap-1 text-sm font-normal text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  <StarFilled className="text-yellow-400" /> {trip.rating} ({trip.ratingCount})
                </span>
              </h3>
              <p className="text-gray-500 text-sm mt-1">{trip.busType} • {trip.availableSeats} chỗ trống</p>
            </div>
            
            {/* Giá tiền Mobile (Ẩn trên desktop) */}
            <div className="sm:hidden text-right">
                <div className="text-blue-600 font-bold text-lg">
                    {trip.price.toLocaleString('vi-VN')}đ
                </div>
            </div>
          </div>

          {/* Lộ trình: Giờ đi - Giờ đến */}
          <div className="mt-4 flex items-stretch gap-3">
             {/* Timeline Visual */}
             <div className="flex flex-col items-center justify-between py-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white"></div>
                <div className="flex-1 w-[1px] border-l border-dashed border-gray-400 my-1"></div>
                <div className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-white"></div>
             </div>

             {/* Thời gian & Địa điểm */}
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
                      <span className="text-red-500 text-xs">(05/12)</span>
                   </span>
                </div>
             </div>
          </div>
        </div>

        {/* 3. Cột giá & Nút đặt (Desktop) */}
        <div className="hidden sm:flex flex-col justify-between items-end min-w-[150px] text-right pl-4 border-l border-gray-100">
           <div>
              <div className="text-blue-600 font-bold text-xl">
                 Từ {trip.price.toLocaleString('vi-VN')}đ
              </div>
              {trip.originalPrice && (
                <div className="text-gray-400 text-sm line-through">
                    {trip.originalPrice.toLocaleString('vi-VN')}đ
                </div>
              )}
           </div>

           <div className="flex flex-col gap-2 w-full mt-4">
             <Button 
               onClick={() => setIsOpen(!isOpen)} 
               className="!bg-[#FFC700] font-bold border-none"
            >
               {isOpen ? 'Đóng lại' : 'Chọn chuyến'}
            </Button>
              <div className="text-xs text-gray-500 text-center cursor-pointer hover:text-blue-600">
                  Thông tin chi tiết <CaretDownOutlined />
              </div>
           </div>

             {isOpen && (
            <div className="border-t border-gray-200 transition-all duration-300 ease-in-out">
                <TripSeatSelection 
                    tripId={trip._id}
                    basePrice={trip.price}
                    onClose={() => setIsOpen(false)}
                    onNext={(selectedSeats) => {
                        console.log("Ghế đã chọn:", selectedSeats);
                        // Chuyển sang bước thanh toán hoặc điền thông tin
                        // router.push('/booking/...')
                    }}
                />
            </div>
        )} 
        </div>
      </div>

      {/* Footer Card: Tiện ích (Optional) */}
      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
          <div className="flex gap-4">
             <span className="text-green-600 font-medium">KHÔNG CẦN THANH TOÁN TRƯỚC</span>
             <span>• Giữ chỗ miễn phí</span>
          </div>
          <div className="flex gap-2">
             <span className="underline cursor-pointer">Chính sách hủy vé</span>
          </div>
      </div>
    </div>
  );
}