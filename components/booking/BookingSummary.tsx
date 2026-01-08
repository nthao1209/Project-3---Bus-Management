import React from 'react';
import { Card, Divider, Button } from 'antd';

interface BookingSummaryProps {
  selectedSeats: any[];
  basePrice: number;
  selectedPickup?: any;
  onNext: () => void;
}

export default function BookingSummary({ 
  selectedSeats, basePrice, selectedPickup, onNext 
}: BookingSummaryProps) {
  
  const calculateTotal = () => {
    const seatTotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
    const surchargeTotal = (selectedPickup?.surcharge || 0) * selectedSeats.length;
    return seatTotal + surchargeTotal;
  };

  return (
    <Card className="shadow-md border-blue-200 bg-blue-50">
      <div className="flex justify-between mb-2 text-sm">
        <span>Ghế đã chọn:</span>
        <span className="font-bold text-blue-600 break-all text-right w-1/2">
          {selectedSeats.length > 0 ? selectedSeats.map(s => s.id).join(', ') : '---'}
        </span>
      </div>
      <Divider className="my-2 bg-gray-300" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Giá ghế ({selectedSeats.length} ghế):</span>
          <span>{(selectedSeats.length * basePrice).toLocaleString()} đ</span>
        </div>
        {selectedPickup?.surcharge > 0 && (
          <div className="flex justify-between">
            <span>Phụ thu điểm đón:</span>
            <span>+{(selectedPickup.surcharge * selectedSeats.length).toLocaleString()} đ</span>
          </div>
        )}
      </div>
      <Divider className="my-2 bg-gray-300" />
      <div className="flex justify-between items-center mb-4">
        <span className="text-lg font-bold text-gray-700">Tổng cộng:</span>
        <span className="text-xl font-bold text-blue-600">
          {calculateTotal().toLocaleString()} đ
        </span>
      </div>
      <Button 
        type="primary" 
        block 
        size="large" 
        onClick={onNext}
        disabled={selectedSeats.length === 0}
        className="bg-[#FFC700] text-black border-none hover:!bg-[#e6b400] font-bold h-12 text-lg"
      >
        TIẾP TỤC
      </Button>
      <div className="mt-2 text-xs text-gray-500 text-center">
        * Ghế sẽ được giữ trong 5 phút để bạn hoàn tất đặt vé
      </div>
    </Card>
  );
}