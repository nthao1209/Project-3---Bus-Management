'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Spin, Empty, Alert, Button, Drawer, FloatButton } from 'antd'; 
import { FilterOutlined, ArrowUpOutlined } from '@ant-design/icons';
import HeroSearch from '@/components/HeroSearch';
import SearchFilter, {FilterState} from '@/components/SearchFilter';
import TripCard from '@/components/TripCard';

interface TripData {
  _id: string;
  companyName: string;
  busType: string;
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
  
  const [openMobileFilter, setOpenMobileFilter] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    sortBy: 'default',
    timeRanges: [],
    priceRange: [0, 10000000],
    selectedOperators: []
  });

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

        if (!res.ok) throw new Error('Không thể tải dữ liệu chuyến xe');

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
    
    const isToday = date === new Date().toISOString().split('T')[0];
    if (isToday) {
      const intervalId = setInterval(fetchTrips, 60000);
      return () => clearInterval(intervalId);
    }
  }, [searchParams, from, to, date]); 
   const filterSummary = useMemo(() => {
    if (trips.length === 0) return { maxPrice: 0, operators: [] };

    let maxPrice = 0;
    const opMap = new Map();

    trips.forEach(t => {
       if (t.basePrice > maxPrice) maxPrice = t.basePrice;
       if (!opMap.has(t.companyName)) {
           opMap.set(t.companyName, { name: t.companyName, count: 0, rating: 4.5 });
       }
       opMap.get(t.companyName).count += 1;
    });

    return {
        maxPrice: Math.ceil(maxPrice / 10000) * 10000, 
        operators: Array.from(opMap.values())
    };
  }, [trips]);


  const filteredTrips = useMemo(() => {
      let result = [...trips];

      //  1. Lọc theo thời gian hiện tại + 30 phút nếu là hôm nay
      const isToday = date === new Date().toISOString().split('T')[0];

      if (isToday) {
        const now = new Date();
        const minAllowTime = new Date(now.getTime() + 30 * 60 * 1000);

        result = result.filter(t => {
          let tripTime: Date | null = null;

          // Trường hợp ISO datetime
          if (t.departureTime.includes('T')) {
            tripTime = new Date(t.departureTime);
          } 
          // Trường hợp HH:mm
          else {
            const [h, m] = t.departureTime.split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, 0, 0);
            tripTime = d;
          }

          return tripTime && tripTime >= minAllowTime;
        });
      }

      //  2. Lọc theo hãng xe
      if (filters.selectedOperators.length > 0) {
        result = result.filter(t =>
          filters.selectedOperators.includes(t.companyName)
        );
      }

      //  3. Lọc theo giá
      result = result.filter(
        t => t.basePrice >= filters.priceRange[0] &&
            t.basePrice <= filters.priceRange[1]
      );

      // 4. Lọc theo khung giờ
      if (filters.timeRanges.length > 0) {
        result = result.filter(t => {
          const hour = new Date(t.departureTime).getHours();
          return filters.timeRanges.some(range => {
            const [start, end] = range.split('-').map(Number);
            return hour >= start && hour < end;
          });
        });
      }

      //  5. Sort
      switch (filters.sortBy) {
        case 'price_asc':
          result.sort((a, b) => a.basePrice - b.basePrice);
          break;
        case 'price_desc':
          result.sort((a, b) => b.basePrice - a.basePrice);
          break;
        case 'early':
          result.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
          break;
        case 'late':
          result.sort((a, b) => b.departureTime.localeCompare(a.departureTime));
          break;
        default:
          break;
      }

      return result;
    }, [trips, filters, date]);

  return (
    <div className="container mx-auto px-4 pb-10">
      <p className="text-gray-500 mt-2">
        Chỉ hiển thị các chuyến khởi hành sau {new Date(Date.now() + 30*60000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="lg:hidden flex justify-between items-center py-4 border-b border-gray-200 mb-4 sticky top-[154px] z-30 bg-[#F2F2F2]">
          <div>
             <span className="text-gray-600 text-sm">Tìm thấy </span>
             <span className="font-bold text-blue-600 text-lg">{trips.length}</span>
             <span className="text-gray-600 text-sm"> chuyến</span>
          </div>
          <Button 
            type="default" 
            icon={<FilterOutlined />} 
            onClick={() => setOpenMobileFilter(true)}
            className="border-blue-500 text-blue-600 font-medium"
          >
            Bộ lọc
          </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 lg:pt-8">
        
        <div className="hidden lg:block lg:col-span-3">
           <div className="sticky top-[180px]"> 
              <SearchFilter 
                maxPrice={filterSummary.maxPrice}
                operators={filterSummary.operators}
                onFilterChange={setFilters}
              />
           </div>
        </div>

        <Drawer
          title="Bộ lọc tìm kiếm"
          placement="right"
          onClose={() => setOpenMobileFilter(false)}
          open={openMobileFilter}
          width="85%"
          styles={{ body: { paddingBottom: 80 } }}
        >
          <SearchFilter 
                maxPrice={filterSummary.maxPrice}
                operators={filterSummary.operators}
                onFilterChange={setFilters}
           />

           <div className="mt-4 flex gap-2">
             <Button block onClick={() => setOpenMobileFilter(false)}>Đóng</Button>
             <Button block type="primary" onClick={() => setOpenMobileFilter(false)}>Áp dụng</Button>
           </div>
        </Drawer>

        <div className="lg:col-span-9">
           <div className="hidden lg:flex justify-between items-end mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                    Kết quả tìm kiếm: {loading ? '...' : trips.length} chuyến
                </h1>
                {from && to && (
                    <p className="text-sm text-gray-500 mt-1">
                        Vé xe từ <span className="font-semibold text-blue-600">{from}</span> đi <span className="font-semibold text-blue-600">{to}</span> ngày {date}
                    </p>
                )}
              </div>
           </div>
           
           {error && <Alert message="Lỗi" description={error} type="error" showIcon className="mb-4" />}

          {loading ? (
             <div className="flex flex-col justify-center items-center py-20 bg-white rounded-xl">
                <Spin size="large" />
                <p className="mt-4 text-gray-500 font-medium">Đang tìm các chuyến xe tốt nhất...</p>
             </div>
           ) : (
             <div className="flex flex-col gap-4">
                {filteredTrips.length === 0 && !error ? (
                    <div className="bg-white p-10 rounded-lg shadow-sm text-center flex flex-col items-center">
                        <Empty description={false} />
                        <p className="text-gray-500 mt-2">Không tìm thấy chuyến xe nào phù hợp với bộ lọc.</p>
                        <Button type="link" onClick={() => setFilters({ sortBy: 'default', timeRanges: [], priceRange: [0, filterSummary.maxPrice], selectedOperators: [] })}>
                            Xóa bộ lọc
                        </Button>
                    </div>
                ) : (
                    filteredTrips.map(trip => (
                        <TripCard 
                            key={trip._id} 
                            trip={{
                                _id: trip._id,
                                companyName: trip.companyName, 
                                busType: trip.busType,         
                                departureTime: trip.departureTime,
                                arrivalTime: trip.arrivalTime,
                                departureStation: trip.departureStation || from || 'Điểm đi',
                                arrivalStation: trip.arrivalStation || to || 'Điểm đến',
                                price: trip.basePrice,
                                availableSeats: trip.availableSeats
                            }} 
                        />
                    ))
                )}
             </div>
           )}
        </div>
      </div>
      
      <FloatButton.BackTop icon={<ArrowUpOutlined />} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F2]">
    
      <div className="sticky top-0 z-50 bg-white shadow-md">
         <Suspense fallback={<div className="h-20 bg-white animate-pulse"></div>}>
            <HeroSearch isCompact={true} />
         </Suspense>
      </div>

      <Suspense fallback={<div className="p-10 text-center"><Spin /></div>}>
         <SearchContent />
      </Suspense>
    </div>
  );
}