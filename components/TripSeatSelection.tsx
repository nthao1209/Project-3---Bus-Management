'use client';

import React, { useState, useEffect } from 'react';
import { Button, message, Spin } from 'antd';
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';

export interface SeatUI {
  id: string;        // Mã ghế (A01, B02...)
  floor: 1 | 2;      // Tầng
  type: 'single' | 'double'; // Loại ghế (phòng đơn/đôi)
  status: 'available' | 'booked' | 'locking'; // Trạng thái từ Trip.seatsStatus
  price: number;     // Trip.basePrice (+ phụ phí nếu có)
  originalPrice?: number;
}

// Props của Component
interface TripSeatSelectionProps {
  tripId: string;
  basePrice: number;
  onClose: () => void;
  onNext: (selectedSeats: SeatUI[]) => void;
}

export default function TripSeatSelection({ tripId, basePrice, onClose, onNext }: TripSeatSelectionProps) {
  const [loading, setLoading] = useState(false);
  const [seats, setSeats] = useState<SeatUI[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  // 1. Giả lập lấy dữ liệu từ API (Mapping từ DB Schema của bạn)
  useEffect(() => {
    setLoading(true);
    // Trong thực tế: const res = await fetch(`/api/trips/${tripId}/seats`);
    // Ở đây mình mock data giống như cấu trúc Bus.seatLayout + Trip.seatsStatus
    setTimeout(() => {
      const mockSeats: SeatUI[] = [
        // --- TẦNG 1 (DƯỚI) ---
        { id: 'A01', floor: 1, type: 'double', status: 'booked', price: 722500, originalPrice: 850000 },
        { id: 'A02', floor: 1, type: 'double', status: 'booked', price: 722500, originalPrice: 850000 },
        { id: 'A03', floor: 1, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        { id: 'A04', floor: 1, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        { id: 'A05', floor: 1, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        { id: 'A06', floor: 1, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        
        // --- TẦNG 2 (TRÊN) ---
        { id: 'B01', floor: 2, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        { id: 'B02', floor: 2, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        { id: 'B03', floor: 2, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        { id: 'B04', floor: 2, type: 'single', status: 'available', price: 510000, originalPrice: 600000 },
        { id: 'B05', floor: 2, type: 'double', status: 'available', price: 722500, originalPrice: 850000 }, // Ghế tím giống ảnh
        { id: 'B06', floor: 2, type: 'single', status: 'booked', price: 510000, originalPrice: 600000 },
      ];
      setSeats(mockSeats);
      setLoading(false);
    }, 500);
  }, [tripId]);

  // 2. Xử lý logic chọn ghế
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

  // Tính tổng tiền
  const totalPrice = selectedSeatIds.reduce((sum, id) => {
    const seat = seats.find(s => s.id === id);
    return sum + (seat?.price || 0);
  }, 0);

  // --- RENDER MỘT GHẾ ---
  const renderSeatItem = (seat: SeatUI) => {
    const isSelected = selectedSeatIds.includes(seat.id);
    const isBooked = seat.status === 'booked';
    const isDouble = seat.type === 'double'; // Phòng đôi

    // Style cơ bản
    let containerClass = `relative flex flex-col items-center justify-center border-2 rounded-lg transition-all cursor-pointer mb-3 select-none `;
    
    // Kích thước (Phòng đôi to hơn)
    if (isDouble) containerClass += "w-[80px] h-[55px] ";
    else containerClass += "w-[50px] h-[50px] ";

    // Màu sắc dựa trên trạng thái
    if (isBooked) {
      containerClass += "bg-gray-200 border-gray-200 cursor-not-allowed text-gray-400";
    } else if (isSelected) {
      containerClass += "bg-green-50 border-green-500 text-green-600 shadow-sm"; // Màu xanh lá khi đang chọn
    } else {
      // Màu viền theo loại ghế (Cam cho đơn, Tím cho đôi - Giống ảnh)
      if (isDouble) containerClass += "bg-white border-purple-400 hover:shadow-md";
      else containerClass += "bg-white border-orange-300 hover:shadow-md";
    }

    return (
      <div 
        key={seat.id} 
        className={containerClass}
        onClick={() => handleSelectSeat(seat)}
      >
        {/* Icon cái gối/giường */}
        {!isBooked && (
          <div className={`w-[60%] h-1.5 rounded-sm mb-1 ${isSelected ? 'bg-green-500' : (isDouble ? 'bg-purple-200' : 'bg-orange-200')}`}></div>
        )}
        
        {/* Mã ghế */}
        <span className={`text-[10px] font-bold ${isBooked ? 'line-through opacity-50' : ''}`}>
           {isBooked ? 'X' : seat.id}
        </span>

        {/* Biểu tượng ghế đôi (2 người) */}
        {isDouble && !isBooked && (
            <div className="absolute bottom-1 right-1 flex gap-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-200"></div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white animate-fadeIn">
      {/* HEADER STEPS */}
      <div className="flex justify-between items-center bg-[#F2F4F7] p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm">
           <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
           <span className="font-bold text-gray-800">Chọn chỗ chiều đi</span>
           <span className="text-gray-300 mx-2">————</span>
           <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-300 text-white text-xs font-bold">2</span>
           <span className="text-gray-500">Chọn điểm đón trả</span>
        </div>
        <CloseOutlined className="text-gray-500 hover:text-red-500 cursor-pointer text-lg" onClick={onClose} />
      </div>

      {/* NOTIFICATION BAR */}
      <div className="p-4 bg-white">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center text-sm">
             <span className="text-gray-700">Quy định cần lưu ý khi đi xe</span>
             <span className="text-blue-600 font-semibold cursor-pointer hover:underline">Xem chi tiết</span>
          </div>
      </div>

      {/* VOUCHER CAROUSEL (Optional - Giống ảnh) */}
      <div className="px-4 pb-2 flex gap-3 overflow-x-auto no-scrollbar">
         <div className="min-w-[260px] border border-blue-100 bg-white p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:shadow-md transition">
             <div className="w-10 h-10 bg-blue-600 rounded text-white font-bold text-[10px] flex items-center justify-center text-center">Tết<br/>2026</div>
             <div>
                 <div className="font-bold text-sm text-gray-800">Giảm 25%, tối đa 50k</div>
                 <div className="text-xs text-gray-500">Đơn hàng không giới hạn...</div>
             </div>
         </div>
         {/* ... thêm voucher khác */}
      </div>

      {/* MAIN CONTENT */}
      {loading ? (
        <div className="h-[300px] flex items-center justify-center"><Spin /></div>
      ) : (
        <div className="flex flex-col md:flex-row p-4 gap-8">
            
            {/* LEFT: LEGEND (CHÚ THÍCH) */}
            <div className="w-full md:w-1/3 space-y-4">
                <h4 className="font-bold text-gray-800">Chú thích</h4>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 bg-gray-200 rounded border border-gray-300 flex items-center justify-center text-gray-400 text-xs">X</div>
                    <span className="text-gray-500">Ghế không bán</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 bg-green-50 rounded border border-green-500"></div>
                    <span className="text-gray-500">Đang chọn</span>
                </div>
                {/* Chú thích Phòng Đôi */}
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-6 bg-white rounded border border-purple-400 mt-1"></div>
                    <div>
                        <div className="text-gray-800">Phòng Đôi (2 khách)</div>
                        <div className="font-bold">722,500đ <span className="line-through text-gray-400 text-xs font-normal">850,000đ</span></div>
                    </div>
                </div>
                {/* Chú thích Phòng Đơn */}
                <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 bg-white rounded border border-orange-300 mt-1"></div>
                    <div>
                        <div className="text-gray-800">Phòng Đơn (1 khách)</div>
                        <div className="font-bold">510,000đ <span className="line-through text-gray-400 text-xs font-normal">600,000đ</span></div>
                    </div>
                </div>
            </div>

            {/* RIGHT: SEAT MAP (SƠ ĐỒ) */}
            <div className="w-full md:w-2/3 bg-[#F8F9FA] rounded-xl p-6 flex justify-center gap-12">
                
                {/* Tầng dưới */}
                <div className="flex flex-col items-center">
                    <span className="text-gray-500 mb-2 font-medium">Tầng dưới</span>
                    {/* Vô lăng */}
                    <InfoCircleOutlined className="text-3xl text-gray-300 mb-6 rotate-180" /> 
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {seats.filter(s => s.floor === 1).map(renderSeatItem)}
                    </div>
                </div>

                {/* Tầng trên */}
                <div className="flex flex-col items-center">
                    <span className="text-gray-500 mb-2 font-medium">Tầng trên</span>
                    <div className="h-[30px] mb-6"></div> {/* Spacer cho ngang bằng vô lăng */}
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {seats.filter(s => s.floor === 2).map(renderSeatItem)}
                    </div>
                </div>

            </div>
        </div>
      )}

      {/* FOOTER: TOTAL & BUTTON */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex justify-between items-center z-10">
          <div>
              <div className="text-xs text-gray-500">Tổng cộng chiều đi:</div>
              <div className="text-xl font-bold text-blue-600">{totalPrice.toLocaleString('vi-VN')}đ</div>
          </div>
          <div className="flex gap-3">
              <div className="text-right flex flex-col justify-center">
                  <span className="text-sm font-bold">{selectedSeatIds.join(', ')}</span>
                  <span className="text-xs text-gray-500">{selectedSeatIds.length} vé</span>
              </div>
              <Button 
                type="primary" 
                size="large" 
                className={`w-[120px] font-bold ${selectedSeatIds.length > 0 ? '!bg-[#FFC700] !text-black' : '!bg-gray-200 !text-gray-400'}`}
                disabled={selectedSeatIds.length === 0}
                onClick={() => onNext(seats.filter(s => selectedSeatIds.includes(s.id)))}
              >
                  Tiếp tục
              </Button>
          </div>
      </div>
    </div>
  );
}