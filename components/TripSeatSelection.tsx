'use client';

import React, { useState, useEffect } from 'react';
import { Button, message, Spin, Alert } from 'antd';
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';

// Interface dữ liệu API trả về
interface ApiTripData {
  _id: string;
  basePrice: number;
  busId: {
    _id: string;
    seatLayout: {
      totalSeats: number;
      totalFloors: number;
      // Giả sử schema layout bạn lưu dạng: { A01: { type: 'single', floor: 1 }, ... } 
      // Hoặc đơn giản là sinh ra theo số lượng. 
      // Ở đây mình sẽ giả định logic sinh ghế đơn giản nếu schema rỗng.
    };
  };
  seatsStatus: Record<string, string>; // { "A01": "booked", "A02": "locking" }
}

export interface SeatUI {
  id: string;        
  floor: 1 | 2;      
  type: 'single' | 'double'; 
  status: 'available' | 'booked' | 'locking'; 
  price: number;     
  originalPrice?: number;
}

interface TripSeatSelectionProps {
  tripId: string;
  basePrice: number; 
  onClose: () => void;
  onNext: (selectedSeats: SeatUI[]) => void;
}

export default function TripSeatSelection({ tripId, onClose, onNext }: TripSeatSelectionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seats, setSeats] = useState<SeatUI[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [tripData, setTripData] = useState<ApiTripData | null>(null);

  // 1. GỌI API LẤY DỮ LIỆU THẬT
  useEffect(() => {
    const fetchSeatData = async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/users/trips/${tripId}`);
        
        if (!res.ok) throw new Error('Không thể tải sơ đồ ghế');
        
        const json = await res.json();
        if (!json.success) throw new Error(json.message);

        const data: ApiTripData = json.data;
        setTripData(data);

        // 2. MAPPING DỮ LIỆU: Layout Bus + Status -> Danh sách ghế UI
        const generatedSeats: SeatUI[] = [];
        const totalSeats = data.busId.seatLayout?.totalSeats || 40;
        const totalFloors = data.busId.seatLayout?.totalFloors || 2;
        const seatsPerFloor = Math.ceil(totalSeats / totalFloors);

        // Logic sinh mã ghế tự động (A01, A02... B01, B02...) nếu DB không lưu cứng
        for (let f = 1; f <= totalFloors; f++) {
            const prefix = f === 1 ? 'A' : 'B'; // Tầng 1 là A, Tầng 2 là B
            for (let i = 1; i <= seatsPerFloor; i++) {
                const seatId = `${prefix}${i.toString().padStart(2, '0')}`; // A01, A02...
                
                const statusFromDb = data.seatsStatus?.[seatId] || 'available'; 
                
                // Xác định loại ghế (đơn/đôi) & giá
                // (Logic này có thể lấy từ DB nếu lưu kỹ, tạm thời hardcode ví dụ)
                const isDouble = seatId === 'B05' || seatId === 'A01'; // Ví dụ ghế vip
                const price = isDouble ? data.basePrice * 1.5 : data.basePrice;

                generatedSeats.push({
                    id: seatId,
                    floor: f as 1 | 2,
                    type: isDouble ? 'double' : 'single',
                    status: statusFromDb as any,
                    price: price,
                    originalPrice: price * 1.1 // Giả lập giá gốc cao hơn chút
                });
            }
        }
        setSeats(generatedSeats);

      } catch (err: any) {
        setError(err.message);
        message.error('Lỗi tải ghế: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tripId) fetchSeatData();
  }, [tripId]);

  // 3. Xử lý chọn ghế (Giữ nguyên logic cũ)
  const handleSelectSeat = (seat: SeatUI) => {
    if (seat.status === 'booked' || seat.status === 'locking') return;

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(prev => prev.filter(id => id !== seat.id));
    } else {
      if (selectedSeatIds.length >= 5) {
        message.warning('Chỉ được chọn tối đa 5 ghế');
        return;
      }
      setSelectedSeatIds(prev => [...prev, seat.id]);
    }
  };

  const totalPrice = selectedSeatIds.reduce((sum, id) => {
    const seat = seats.find(s => s.id === id);
    return sum + (seat?.price || 0);
  }, 0);

  // --- RENDER MỘT GHẾ (Giữ nguyên style đẹp cũ) ---
  const renderSeatItem = (seat: SeatUI) => {
    const isSelected = selectedSeatIds.includes(seat.id);
    const isBooked = seat.status === 'booked' || seat.status === 'locking';
    const isDouble = seat.type === 'double';

    let containerClass = `relative flex flex-col items-center justify-center border-2 rounded-lg transition-all cursor-pointer mb-3 select-none `;
    
    if (isDouble) containerClass += "w-[80px] h-[55px] ";
    else containerClass += "w-[50px] h-[50px] ";

    if (isBooked) {
      containerClass += "bg-gray-200 border-gray-200 cursor-not-allowed text-gray-400";
    } else if (isSelected) {
      containerClass += "bg-green-50 border-green-500 text-green-600 shadow-sm"; 
    } else {
      if (isDouble) containerClass += "bg-white border-purple-400 hover:shadow-md";
      else containerClass += "bg-white border-orange-300 hover:shadow-md";
    }

    return (
      <div key={seat.id} className={containerClass} onClick={() => handleSelectSeat(seat)}>
        {!isBooked && (
          <div className={`w-[60%] h-1.5 rounded-sm mb-1 ${isSelected ? 'bg-green-500' : (isDouble ? 'bg-purple-200' : 'bg-orange-200')}`}></div>
        )}
        <span className={`text-[10px] font-bold ${isBooked ? 'line-through opacity-50' : ''}`}>
           {isBooked ? 'X' : seat.id}
        </span>
        {isDouble && !isBooked && (
            <div className="absolute bottom-1 right-1 flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
            </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="h-[300px] flex justify-center items-center"><Spin tip="Đang tải sơ đồ ghế..." /></div>;
  if (error) return <div className="p-4 text-center text-red-500">Lỗi: {error}</div>;

  return (
    <div className="bg-white animate-fadeIn">
      {/* HEADER STEPS */}
      <div className="flex justify-between items-center bg-[#F2F4F7] p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm">
           <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
           <span className="font-bold text-gray-800">Chọn chỗ</span>
           <span className="text-gray-300 mx-2">————</span>
           <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-300 text-white text-xs font-bold">2</span>
           <span className="text-gray-500">Thông tin</span>
        </div>
        <CloseOutlined className="text-gray-500 hover:text-red-500 cursor-pointer text-lg" onClick={onClose} />
      </div>

      {/* NOTIFICATION BAR */}
      <div className="p-4 bg-white">
          <Alert message="Trẻ em dưới 5 tuổi được miễn phí vé nếu ngồi chung với người lớn." type="info" showIcon className="border-blue-100 bg-blue-50" />
      </div>

      <div className="flex flex-col md:flex-row p-4 gap-8">
            {/* LEFT: CHÚ THÍCH */}
            <div className="w-full md:w-1/3 space-y-4">
                <h4 className="font-bold text-gray-800">Chú thích</h4>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 bg-gray-200 rounded border border-gray-300 flex items-center justify-center text-gray-400 text-xs">X</div>
                    <span className="text-gray-500">Đã bán</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 bg-green-50 rounded border border-green-500"></div>
                    <span className="text-gray-500">Đang chọn</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 bg-white rounded border border-orange-300 mt-1"></div>
                    <div>
                        <div className="text-gray-800">Ghế thường</div>
                        <div className="font-bold">{tripData?.basePrice.toLocaleString()}đ</div>
                    </div>
                </div>
            </div>

            {/* RIGHT: SEAT MAP */}
            <div className="w-full md:w-2/3 bg-[#F8F9FA] rounded-xl p-6 flex justify-center gap-12 overflow-x-auto">
                {/* Tầng 1 */}
                <div className="flex flex-col items-center">
                    <span className="text-gray-500 mb-2 font-medium">Tầng dưới</span>
                    <InfoCircleOutlined className="text-3xl text-gray-300 mb-6 rotate-180" /> 
                    <div className="grid grid-cols-3 gap-3"> {/* Grid 3 cột cho xe giường nằm */}
                        {seats.filter(s => s.floor === 1).map(renderSeatItem)}
                    </div>
                </div>

                {/* Tầng 2 (Chỉ hiện nếu có) */}
                {seats.some(s => s.floor === 2) && (
                    <div className="flex flex-col items-center">
                        <span className="text-gray-500 mb-2 font-medium">Tầng trên</span>
                        <div className="h-[30px] mb-6"></div> 
                        <div className="grid grid-cols-3 gap-3">
                            {seats.filter(s => s.floor === 2).map(renderSeatItem)}
                        </div>
                    </div>
                )}
            </div>
      </div>

      {/* FOOTER */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg flex justify-between items-center z-10">
          <div>
              <div className="text-xs text-gray-500">Tổng cộng:</div>
              <div className="text-xl font-bold text-blue-600">{totalPrice.toLocaleString('vi-VN')}đ</div>
          </div>
          <Button 
            type="primary" 
            size="large" 
            className={`w-[140px] font-bold ${selectedSeatIds.length > 0 ? '!bg-[#FFC700] !text-black' : '!bg-gray-200 !text-gray-400'}`}
            disabled={selectedSeatIds.length === 0}
            onClick={() => onNext(seats.filter(s => selectedSeatIds.includes(s.id)))}
          >
              Tiếp tục
          </Button>
      </div>
    </div>
  );
}