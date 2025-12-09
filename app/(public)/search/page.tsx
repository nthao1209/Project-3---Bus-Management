'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; // 1. Import hook này
import HeroSearch from '@/components/HeroSearch';
import SearchFilter from '@/components/SearchFilter';
import TripCard from '@/components/TripCard';

// Component con để hiển thị nội dung search
// Không cần nhận props searchParams nữa, tự lấy bằng hook
function SearchContent() {
  // 2. Sử dụng hook để lấy tham số URL
  const searchParams = useSearchParams();
  
  // 3. Lấy dữ liệu bằng .get()
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  // Dữ liệu giả (Mocking DB Response)
  const MOCK_TRIPS = [
      {
        _id: '1',
        companyName: 'Tân Niên',
        rating: 4.5,
        ratingCount: 1890,
        busType: 'Limousine Phòng Đôi 24 chỗ',
        busImage: '/Logo.png',
        departureTime: '2025-12-04T19:00:00',
        arrivalTime: '2025-12-05T07:10:00',
        departureStation: 'Bến Xe Châu Đốc',
        arrivalStation: 'Bến xe liên tỉnh Đà Lạt',
        duration: 730,
        price: 510000,
        originalPrice: 600000,
        availableSeats: 5
      }
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="hidden lg:block lg:col-span-3">
           <SearchFilter />
        </div>

        <div className="lg:col-span-9">
           <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-800">
                  Kết quả: {MOCK_TRIPS.length} chuyến
              </h1>
              <p className="text-sm text-gray-500">
                  Vé xe từ <strong>{from || '...'}</strong> đi <strong>{to || '...'}</strong>
              </p>
           </div>
           
           <div className="flex flex-col gap-4">
              {MOCK_TRIPS.map(trip => (
                  <TripCard key={trip._id} trip={trip} />
              ))}
           </div>
        </div>

      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <Suspense fallback={<div>Loading Hero Search...</div>}>
         <HeroSearch isCompact={true} />
      </Suspense>

      <Suspense fallback={<div className="p-10 text-center">Đang tìm chuyến xe...</div>}>
         <SearchContent />
      </Suspense>
    </div>
  );
}