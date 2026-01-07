'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Spin, Empty, Alert } from 'antd'; 
import HeroSearch from '@/components/HeroSearch';
import SearchFilter from '@/components/SearchFilter';
import TripCard from '@/components/TripCard';

// 1. SỬA INTERFACE: Khớp với dữ liệu trả về từ API (Formatted Data)
interface TripData {
  _id: string;
  companyName: string;      // Backend trả về companyName, không phải companyId object
  busType: string;          // Backend trả về busType
  departureTime: string;
  arrivalTime: string;
  departureStation: string;
  arrivalStation: string;
  basePrice: number;
  availableSeats: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date');

  useEffect(() => {
    const fetchTrips = async () => {
      if (!from || !to || !date) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setTrips([]);

      try {
        const query = new URLSearchParams({
          fromStation: from, 
          toStation: to,
          date: date
        }).toString();

      
        const res = await fetch(`/api/users/trips?${query}`, {
            method: 'GET',
            cache: 'no-store' 
        });

        if (!res.ok) {
            throw new Error('Không thể tải dữ liệu chuyến xe');
        }

        const data = await res.json();
        
        if (data.success) {
          setTrips(data.data);
        } else {
          setTrips([]);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [searchParams]); 

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="hidden lg:block lg:col-span-3">
           <SearchFilter />
        </div>

        <div className="lg:col-span-9">
           <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-800">
                  {loading ? 'Đang tìm kiếm...' : `Kết quả: ${trips.length} chuyến`}
              </h1>
              {from && to && (
                  <p className="text-sm text-gray-500">
                      Vé xe từ <strong>{from}</strong> đi <strong>{to}</strong> ngày <strong>{date}</strong>
                  </p>
              )}
           </div>
           
           {error && <Alert message="Lỗi" description={error} type="error" showIcon className="mb-4" />}

           {loading ? (
             <div className="flex justify-center items-center py-20">
                <Spin size="large" tip="Đang tìm các chuyến xe tốt nhất..." />
             </div>
           ) : (
             <div className="flex flex-col gap-4">
                {trips.length === 0 && !error ? (
                    <Empty description="Không tìm thấy chuyến xe nào phù hợp." />
                ) : (
                    trips.map(trip => (
                        <TripCard 
                            key={trip._id} 
                            trip={{
                                _id: trip._id,
                                companyName: trip.companyName, 
                                busType: trip.busType,         
                                busImage: '/Logo.png', // Ảnh mặc định (Backend chưa trả về ảnh)
                                departureTime: trip.departureTime,
                                arrivalTime: trip.arrivalTime,
                                departureStation: trip.departureStation || from || 'Điểm đi',
                                arrivalStation: trip.arrivalStation || to || 'Điểm đến',
                                duration: 0, // Bạn có thể tính duration ở backend gửi về luôn
                                price: trip.basePrice,
                                originalPrice: trip.basePrice, 
                                rating: 4.5, 
                                ratingCount: 100,
                                availableSeats: trip.availableSeats // Backend đã tính toán sẵn
                            }} 
                        />
                    ))
                )}
             </div>
           )}
        </div>

      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <Suspense fallback={<div className="h-20 bg-white"></div>}>
         <HeroSearch isCompact={true} />
      </Suspense>

      <Suspense fallback={<div className="p-10 text-center"><Spin /></div>}>
         <SearchContent />
      </Suspense>
    </div>
  );
}