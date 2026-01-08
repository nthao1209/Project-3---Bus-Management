import React from 'react';
import { Card, Tooltip } from 'antd';

const SteeringWheelIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-gray-400">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor" fillOpacity="0.2"/>
    <path d="M12 6C8.69 6 6 8.69 6 12H9C9 10.34 10.34 9 12 9V6Z" fill="currentColor"/>
    <path d="M12 6V9C13.66 9 15 10.34 15 12H18C18 8.69 15.31 6 12 6Z" fill="currentColor"/>
    <path d="M12 18C10.83 18 9.83 17.29 9.35 16.26L6.5 17.5C7.6 19.57 9.65 21 12 21C14.35 21 16.4 19.57 17.5 17.5L14.65 16.26C14.17 17.29 13.17 18 12 18Z" fill="currentColor"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

interface SeatMapProps {
  busType: string;
  seatSchema: string[][];
  seatStatusMap: Record<string, any>;
  heldSeats: Record<string, string>;
  myHeldSeats: Set<string>;
  selectedSeats: any[];
  socketId?: string;
  onSelectSeat: (seatCode: string) => void;
}

export default function SeatMap({
  busType,
  seatSchema,
  seatStatusMap,
  heldSeats,
  myHeldSeats,
  selectedSeats,
  socketId,
  onSelectSeat
}: SeatMapProps) {

  // Logic xác định trạng thái hiển thị của từng ghế
  const getSeatDisplayStatus = (seatCode: string) => {
    const rawStatus = seatStatusMap[seatCode];
    const dbStatus = rawStatus?.status;

    const isHeldByOthers = heldSeats[seatCode] && heldSeats[seatCode] !== socketId;
    const isMyHeldSeat = myHeldSeats.has(seatCode);
    const isSelectedByMe = selectedSeats.find(s => s.id === seatCode);
    
    const isBooked = ['confirmed', 'booked', 'pending_payment'].includes(dbStatus);

    if (isBooked) return 'sold';
    if (isHeldByOthers) return 'held-by-others';
    if (isMyHeldSeat || isSelectedByMe) return 'selected';
    return 'available';
  };

  return (
    <Card 
      title={
        <div className="flex justify-between items-center">
            <span>Chọn ghế ({busType})</span>
            <div className="flex gap-3 text-xs font-normal">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div> Trống</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded"></div> Đang chọn</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded"></div> Người khác giữ</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded"></div> Đã đặt</div>
            </div>
        </div>
      } 
      className="shadow-sm mb-4"
    >
      <div className="flex justify-start border-b border-dashed border-gray-200 pb-4 mb-6 relative">
          <div className="flex flex-col items-center">
              <SteeringWheelIcon />
              <span className="text-[10px] text-gray-400 mt-1">Tài xế</span>
          </div>
          <div className="absolute right-0 top-0 text-gray-400 text-xs border border-gray-200 px-2 py-1 rounded bg-gray-50">
              Cửa lên xuống
          </div>
      </div>

      <div className="flex flex-col gap-3 items-center w-full overflow-x-auto">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 inline-block min-w-[280px]">
          {seatSchema.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 mb-3 justify-center">
              {row.map((seatCode, colIndex) => {
                if (!seatCode) return <div key={`${rowIndex}-${colIndex}`} className="w-10 h-10" />;

                const status = getSeatDisplayStatus(seatCode);
                let seatClass = "w-10 h-10 flex items-center justify-center rounded-t-lg rounded-b-md text-xs font-bold transition-all shadow-sm border cursor-pointer select-none relative ";
                let tooltipText = `Ghế ${seatCode}`;
                let isClickable = true;

                switch(status) {
                  case 'sold':
                    seatClass += "bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed";
                    tooltipText = "Ghế đã bán";
                    isClickable = false;
                    break;
                  case 'held-by-others':
                    seatClass += "bg-yellow-100 border-yellow-400 text-yellow-700 cursor-not-allowed";
                    tooltipText = "Đang được giữ bởi người khác";
                    isClickable = false;
                    break;
                  case 'selected':
                    seatClass += "bg-blue-600 border-blue-600 text-white transform -translate-y-1 shadow-md";
                    tooltipText = "Ghế bạn đang chọn (click để bỏ)";
                    break;
                  default:
                    seatClass += "bg-white border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:shadow-md";
                }

                return (
                  <Tooltip key={seatCode} title={tooltipText}>
                      <div className={seatClass} onClick={() => isClickable && onSelectSeat(seatCode)}>
                          {seatCode.replace(/[A-Z]/g, '')}
                      </div>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}