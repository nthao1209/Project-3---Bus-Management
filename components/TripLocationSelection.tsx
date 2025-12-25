'use client';

import React, { useState, useEffect } from 'react';
import { Button, Radio, Input, Spin, message, Space, Divider } from 'antd';
import { 
  CloseOutlined, EnvironmentFilled, SearchOutlined, 
  LeftOutlined, CheckCircleFilled 
} from '@ant-design/icons';
import dayjs from 'dayjs';

// Interface cho dữ liệu điểm đón/trả
interface Point {
  _id: string;
  time: string; // ISO date string
  name: string;
  address?: string; // Địa chỉ chi tiết (nếu có populate từ Station)
  stationId?: {
    name: string;
    address: string;
    province: string;
  } | string;
}

interface TripLocationProps {
  tripId: string;
  totalPrice: number;
  selectedSeats: string[]; // Danh sách ghế đã chọn ở bước trước
  onClose: () => void;
  onBack: () => void; // Quay lại bước chọn ghế
  onNext: (pickup: Point, dropoff: Point) => void; // Sang bước thanh toán
}

export default function TripLocationSelection({ 
  tripId, totalPrice, selectedSeats, onClose, onBack, onNext 
}: TripLocationProps) {
  
  const [loading, setLoading] = useState(true);
  const [pickupPoints, setPickupPoints] = useState<Point[]>([]);
  const [dropoffPoints, setDropoffPoints] = useState<Point[]>([]);
  
  // State lưu điểm đã chọn
  const [selectedPickup, setSelectedPickup] = useState<string>(''); 
  const [selectedDropoff, setSelectedDropoff] = useState<string>('');

  // State tìm kiếm
  const [searchPickup, setSearchPickup] = useState('');
  const [searchDropoff, setSearchDropoff] = useState('');

  // 1. Fetch dữ liệu từ API Trips
  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/trips/${tripId}`);
        const json = await res.json();
        
        if (json.success) {
          const trip = json.data;
          // Sắp xếp điểm đón theo thời gian
          const sortedPickups = (trip.pickupPoints || []).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
          const sortedDropoffs = (trip.dropoffPoints || []).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
          
          setPickupPoints(sortedPickups);
          setDropoffPoints(sortedDropoffs);

          // Tự động chọn điểm đầu tiên cho tiện
          if (sortedPickups.length > 0) setSelectedPickup(sortedPickups[0]._id);
          if (sortedDropoffs.length > 0) setSelectedDropoff(sortedDropoffs[0]._id);
        }
      } catch (error) {
        message.error('Không thể tải thông tin điểm đón trả');
      } finally {
        setLoading(false);
      }
    };

    if (tripId) fetchTripDetails();
  }, [tripId]);

  // 2. Xử lý Submit
  const handleNext = () => {
    if (!selectedPickup || !selectedDropoff) {
      message.warning('Vui lòng chọn đầy đủ điểm đón và điểm trả');
      return;
    }
    const pickup = pickupPoints.find(p => p._id === selectedPickup)!;
    const dropoff = dropoffPoints.find(p => p._id === selectedDropoff)!;
    onNext(pickup, dropoff);
  };

  const filterPoints = (points: Point[], keyword: string) => {
    if (!keyword) return points;
    const lowerKey = keyword.toLowerCase();
    return points.filter(p => 
      p.name.toLowerCase().includes(lowerKey) || 
      (typeof p.stationId === 'object' && p.stationId?.address.toLowerCase().includes(lowerKey))
    );
  };

  const filteredPickups = filterPoints(pickupPoints, searchPickup);
  const filteredDropoffs = filterPoints(dropoffPoints, searchDropoff);

  const renderPointItem = (point: Point, isPickup: boolean) => {
    const isSelected = isPickup ? selectedPickup === point._id : selectedDropoff === point._id;
    const timeStr = dayjs(point.time).format('HH:mm');
    const dateStr = dayjs(point.time).format('DD/MM');
    
    // Lấy địa chỉ hiển thị (ưu tiên từ Station nếu có)
    const displayAddress = typeof point.stationId === 'object' 
        ? point.stationId?.address 
        : "Địa điểm dọc đường";

    return (
      <div 
        key={point._id}
        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-100 last:border-0 ${isSelected ? 'bg-blue-50' : ''}`}
        onClick={() => isPickup ? setSelectedPickup(point._id) : setSelectedDropoff(point._id)}
      >
        <Radio checked={isSelected} className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
             <span className="font-bold text-gray-800 text-lg">{timeStr}</span>
             <span className="text-xs text-gray-400">({dateStr})</span>
             <span className="text-gray-300">•</span>
             <span className="font-bold text-gray-700">{point.name}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">{displayAddress}</div>
        </div>
        <div className="flex flex-col items-center justify-center text-blue-600 cursor-pointer hover:underline min-w-[50px]">
           <EnvironmentFilled className="text-lg mb-1" />
           <span className="text-[10px]">Bản đồ</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white animate-fadeIn flex flex-col h-full max-h-[80vh]">
      
      {/* HEADER STEPS */}
      <div className="flex justify-between items-center bg-[#F2F4F7] p-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
           <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold cursor-pointer" onClick={onBack}>✓</span>
           <span className="font-bold text-green-600 cursor-pointer" onClick={onBack}>Chọn chỗ</span>
           <span className="text-blue-600 mx-2">————</span>
           <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
           <span className="text-blue-600 font-bold">Điểm đón trả</span>
        </div>
        <CloseOutlined className="text-gray-500 hover:text-red-500 cursor-pointer text-lg" onClick={onClose} />
      </div>

      {/* NOTIFICATION */}
      <div className="p-4 flex-shrink-0">
         <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
            <CheckCircleFilled /> An tâm được đón đúng nơi, trả đúng chỗ đã chọn.
         </div>
      </div>

      {/* MAIN CONTENT (SCROLLABLE) */}
      <div className="flex-1 overflow-hidden p-4 pt-0">
        {loading ? (
            <div className="h-full flex items-center justify-center"><Spin tip="Đang tải địa điểm..." /></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                
                {/* CỘT ĐIỂM ĐÓN */}
                <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-2">Điểm đón</h3>
                        <Input 
                            prefix={<SearchOutlined className="text-gray-400"/>} 
                            placeholder="Tìm điểm đón..." 
                            value={searchPickup}
                            onChange={(e) => setSearchPickup(e.target.value)}
                            allowClear
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredPickups.length > 0 ? (
                            filteredPickups.map(p => renderPointItem(p, true))
                        ) : (
                            <div className="p-4 text-center text-gray-400">Không tìm thấy điểm đón</div>
                        )}
                    </div>
                </div>

                {/* CỘT ĐIỂM TRẢ */}
                <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-2">Điểm trả</h3>
                        <Input 
                            prefix={<SearchOutlined className="text-gray-400"/>} 
                            placeholder="Tìm điểm trả..." 
                            value={searchDropoff}
                            onChange={(e) => setSearchDropoff(e.target.value)}
                            allowClear
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredDropoffs.length > 0 ? (
                            filteredDropoffs.map(p => renderPointItem(p, false))
                        ) : (
                            <div className="p-4 text-center text-gray-400">Không tìm thấy điểm trả</div>
                        )}
                    </div>
                </div>

            </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex justify-between items-center z-10 flex-shrink-0">
          <Button icon={<LeftOutlined />} onClick={onBack}>Quay lại</Button>
          
          <div className="flex items-center gap-4">
              <div className="text-right">
                  <div className="text-xs text-gray-500">Tổng tiền ({selectedSeats.length} vé):</div>
                  <div className="text-xl font-bold text-blue-600">{totalPrice.toLocaleString('vi-VN')}đ</div>
              </div>
              <Button 
                type="primary" 
                size="large" 
                className="w-[140px] font-bold !bg-[#FFC700] !text-black border-none"
                onClick={handleNext}
              >
                  Tiếp tục
              </Button>
          </div>
      </div>
    </div>
  );
}