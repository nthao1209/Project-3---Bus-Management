'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import { 
  Spin, message, Card, Button, Divider, Row, Col, Radio, Tag, Typography, Tooltip 
} from 'antd';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeftOutlined, EnvironmentOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import BookingCheckoutForm from '@/components/BookingCheckoutForm';
import { io, Socket } from 'socket.io-client';

const SteeringWheelIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 rotate-0">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20Z" fill="currentColor" fillOpacity="0.2"/>
    <path d="M12 6C8.69 6 6 8.69 6 12H9C9 10.34 10.34 9 12 9V6Z" fill="currentColor"/>
    <path d="M12 6V9C13.66 9 15 10.34 15 12H18C18 8.69 15.31 6 12 6Z" fill="currentColor"/>
    <path d="M12 18C10.83 18 9.83 17.29 9.35 16.26L6.5 17.5C7.6 19.57 9.65 21 12 21C14.35 21 16.4 19.57 17.5 17.5L14.65 16.26C14.17 17.29 13.17 18 12 18Z" fill="currentColor"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

// --- Interfaces ---
interface SeatUI {
  id: string;      
  price: number;   
  status: 'available' | 'booked' | 'pending_payment' | 'selected';
}

interface Point {
  _id: string;
  name: string;
  address: string;
  time: string;
  surcharge?: number;
  timeOffset?: number;
}

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [step, setStep] = useState(1); 

  const [selectedSeats, setSelectedSeats] = useState<SeatUI[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<Point | null>(null);
  const [selectedDropoff, setSelectedDropoff] = useState<Point | null>(null);
  
  const [seatSchema, setSeatSchema] = useState<string[][]>([]); 
  const [seatStatusMap, setSeatStatusMap] = useState<Record<string, any>>({});

  const socketRef = useRef<Socket | null>(null);
  const [heldSeats, setHeldSeats] = useState<Record<string, string>>({}); 
  const [myHeldSeats, setMyHeldSeats] = useState<Set<string>>(new Set());

  const handleBookingSuccess = () => {
    selectedSeats.forEach(seat => {
      socketRef.current?.emit('release_seat', { tripId, seatCode: seat.id });
    });
    
    setSelectedSeats([]);
    setMyHeldSeats(new Set());
    setStep(1);
    router.push('/booking/success');
  };

  useEffect(() => {
    if(!tripId) return;
    
    socketRef.current = io(); 
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join_trip', tripId);
    });

    socket.on('seat_held', ({ seatCode, socketId }: any) => {
      console.log('seat_held received:', { seatCode, socketId, mySocketId: socket.id });
      
      setHeldSeats(prev => ({ ...prev, [seatCode]: socketId }));

      if (socketId === socket.id) {
        console.log('This is MY held seat:', seatCode);
        setMyHeldSeats(prev => {
                  const newSet = new Set(prev);
                  newSet.add(seatCode);
                  return newSet;
                });        
        setSelectedSeats(prev => prev.some(s => s.id === seatCode)
          ? prev
          : [...prev, {
              id: seatCode,
              price: trip?.basePrice || 0,
              status: 'selected'
            }]);
      }


      setSeatStatusMap(prev => ({
        ...prev,
        [seatCode]: {
          status: 'holding',
          socketId
        }
      }));
    });

      socket.on('seat_released', ({ seatCode, socketId }: any) => {
      console.log('Server báo nhả ghế:', seatCode, 'bởi', socketId);

      // 1. Cập nhật trạng thái chung của phòng (về available)
      setSeatStatusMap(prev => {
        const newMap = { ...prev };
        newMap[seatCode] = { status: 'available' }; 
        return newMap;
      });
      
      // Xóa khỏi danh sách người khác giữ
      setHeldSeats(prev => {
        const newState = { ...prev };
        delete newState[seatCode];
        return newState;
      });

      // 2. Logic QUAN TRỌNG: Nếu là mình nhả hoặc bị Server ép nhả (force_sync)
      if (socketId === socket.id || socketId === 'force_sync') {
        console.log('-> Xóa ghế khỏi danh sách chọn của tôi:', seatCode);
        
        setMyHeldSeats(prev => {
          const newSet = new Set(prev);
          newSet.delete(seatCode);
          return newSet;
        });
        
        setSelectedSeats(prev => prev.filter(s => s.id !== seatCode));
      }
    });
    
    socket.on('seat_auto_released', ({ seatCode }: any) => {
      console.log('seat_auto_released:', seatCode);
      message.info(`Ghế ${seatCode} đã được tự động giải phóng sau 5 phút`);
      
      setHeldSeats(prev => {
        const newState = { ...prev };
        delete newState[seatCode];
        return newState;
      });

      setMyHeldSeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(seatCode);
        return newSet;
      });

      setSeatStatusMap(prev => {
        const newMap = { ...prev };
        delete newMap[seatCode];
        return newMap;
      });
      
      setSelectedSeats(prev => prev.filter(s => s.id !== seatCode));
    });

    socket.on('sync_seat_status', (serverHeldSeats: any) => {
      console.log('sync_seat_status received:', serverHeldSeats);
      const simpleMap: Record<string, string> = {};
      const mySeats = new Set<string>();
      
      Object.keys(serverHeldSeats).forEach(key => {
        simpleMap[key] = serverHeldSeats[key].socketId;
        
        if (serverHeldSeats[key].socketId === socket.id) {
          mySeats.add(key);
          
          setSelectedSeats(prev => prev.some(s => s.id === key)
            ? prev
            : [...prev, {
                id: key,
                price: trip?.basePrice || 0,
                status: 'selected'
              }]);
        }
      });
      
      setHeldSeats(simpleMap);
      setMyHeldSeats(mySeats);
    });

    socket.on('error_message', (msg: string) => {
      message.error(msg);
    });

    return () => {
      console.log('Cleaning up...');
      // Release tất cả ghế mình đang giữ
      myHeldSeats.forEach(seatCode => {
        socket?.emit('release_seat', { tripId, seatCode });
      });
      
      if (socket) {
        socket.disconnect();
      }
    };
  }, [tripId]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await fetch(`/api/users/trips/${tripId}`);
        const json = await res.json();

        if (json.success) {
          const data = json.data;

          // 1. CHUẨN HÓA THỜI GIAN ĐIỂM ĐÓN (Pickup)
          // Mốc chuẩn: Giờ khởi hành của chuyến xe (departureTime)
          const tripDeparture = dayjs(data.departureTime);

          if (Array.isArray(data.pickupPoints)) {
            data.pickupPoints = data.pickupPoints.map((p: any) => {
              let calculatedTime;
              
              if (p.time) {
                // Nếu DB đã lưu giờ cụ thể -> Dùng luôn
                calculatedTime = dayjs(p.time);
              } else {
                // Nếu không, tính bằng: Giờ khởi hành + timeOffset (số phút)
                // Nếu không có offset thì mặc định là 0 (chính là giờ khởi hành)
                calculatedTime = tripDeparture.add(p.timeOffset || 0, 'minute');
              }
              
              return { 
                ...p, 
                computedTime: calculatedTime.toISOString() 
              };
            });
            
            // Sắp xếp điểm đón theo thời gian tăng dần (để điểm sớm nhất lên đầu)
            data.pickupPoints.sort((a: any, b: any) => dayjs(a.computedTime).valueOf() - dayjs(b.computedTime).valueOf());
          }

          // 2. CHUẨN HÓA THỜI GIAN ĐIỂM TRẢ (Dropoff)
          // Lưu ý: Điểm trả cũng thường tính offset từ giờ khởi hành (hoặc giờ đến dự kiến)
          if (Array.isArray(data.dropoffPoints)) {
            data.dropoffPoints = data.dropoffPoints.map((p: any) => {
              let calculatedTime;

              if (p.time) {
                 calculatedTime = dayjs(p.time);
              } else {
                 // Nếu có offset, cộng từ giờ KHỞI HÀNH (departureTime)
                 // Ví dụ: Xe chạy 8 tiếng, điểm trả cuối offset = 480 phút
                 calculatedTime = tripDeparture.add(p.timeOffset || 0, 'minute');
              }

              return { 
                ...p, 
                computedTime: calculatedTime.toISOString() 
              };
            });

             // Sắp xếp điểm trả theo thời gian (để điểm đến cuối cùng nằm cuối list)
             data.dropoffPoints.sort((a: any, b: any) => dayjs(a.computedTime).valueOf() - dayjs(b.computedTime).valueOf());
          }

          setTrip(data);

          // 3. THIẾT LẬP MẶC ĐỊNH (Theo yêu cầu của bạn)
          
          // Mặc định điểm đón: Chọn điểm ĐẦU TIÊN (Index 0)
          if (data.pickupPoints?.length > 0) {
            setSelectedPickup(data.pickupPoints[0]);
          }

          // Mặc định điểm trả: Chọn điểm CUỐI CÙNG (Hành trình đi từ A -> B thì B thường ở cuối)
          // Hoặc dùng data.dropoffPoints[0] nếu bạn muốn chọn điểm trả đầu tiên.
          // Ở đây tôi để điểm cuối cùng theo logic "Start & End points"
          if (data.dropoffPoints?.length > 0) {
            const lastIndex = data.dropoffPoints.length - 1;
            setSelectedDropoff(data.dropoffPoints[lastIndex]);
          }

          const busLayout = data.bus?.seatLayout || data.busId?.seatLayout;
          let schema = busLayout?.schema;
          if (!schema || !Array.isArray(schema) || schema.length === 0) {
            const total = busLayout?.totalSeats || 40;
            schema = [];
            let row: string[] = [];
            for(let i=1; i<=total; i++) {
                const code = `${i.toString().padStart(2,'0')}`;
                row.push(code);
                if(row.length === 4 || i === total) {
                    schema.push(row);
                    row = [];
                }
            }
          }
          setSeatSchema(schema);
          
          const bookedMap = data.seatsStatus || {}; 
          setSeatStatusMap(bookedMap);

          if (socketRef.current?.connected) {
            socketRef.current.emit('sync_seat_status', tripId);
          }
        } else {
          message.error('Không tìm thấy chuyến đi');
          router.push('/');
        }
      } catch (error) {
        console.error(error);
        message.error('Lỗi kết nối');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, router]);

   const handleSelectSeat = (seatCode: string) => {
    if (!seatCode) return;
    const socket = socketRef.current;
    if (!socket) return message.error('Mất kết nối server');

    const rawStatus = seatStatusMap[seatCode];
    const dbStatus = rawStatus?.status; 
    
    // Kiểm tra kỹ: Server có ghi nhận ghế này là của mình không?
    const heldByMySocket = rawStatus?.socketId === socket.id;
    // Kiểm tra: Client có đang chọn không?
    const isSelectedLocally = selectedSeats.some(s => s.id === seatCode);

    // LOGIC CHỌN / BỎ CHỌN
    const isMySeat = isSelectedLocally || heldByMySocket;

    if (isMySeat) {
        // ==> RELEASE
        console.log('Action: RELEASE', seatCode);
        socket.emit('release_seat', { tripId, seatCode });
        
        // Xóa ngay lập tức ở Client để UI mượt (Optimistic Update)
        setSelectedSeats(prev => prev.filter(s => s.id !== seatCode));
        setMyHeldSeats(prev => {
            const newSet = new Set(prev);
            newSet.delete(seatCode);
            return newSet;
        });
        
    } else {
        // ==> HOLD
        if (dbStatus === 'booked' || dbStatus === 'sold') return message.warning('Ghế đã bán');
        if (dbStatus === 'holding' && !heldByMySocket) return message.warning('Ghế người khác đang giữ');
        if (selectedSeats.length >= 5) return message.warning('Tối đa 5 ghế');

        console.log('Action: HOLD', seatCode);
        socket.emit('hold_seat', { tripId, seatCode });
        
        // Hiển thị ngay
        const newSeat: SeatUI = { id: seatCode, price: trip.basePrice, status: 'selected' };
        setSelectedSeats(prev => [...prev, newSeat]);
        setMyHeldSeats(prev => new Set([...prev, seatCode]));
    }
  };

  const calculateTotal = () => {
    const seatTotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
    const surchargeTotal = (selectedPickup?.surcharge || 0) * selectedSeats.length;
    return seatTotal + surchargeTotal;
  };

  const handleNextStep = () => {
    if (selectedSeats.length === 0) return message.error('Vui lòng chọn ít nhất 1 ghế');
    if (!selectedPickup || !selectedDropoff) return message.error('Vui lòng chọn điểm đón/trả');
    setStep(2);
  };

  const formatTime = (isoString: string) => isoString ? dayjs(isoString).format('HH:mm') : '--:--';

  const getSeatStatus = (seatCode: string) => {
    const rawStatus = seatStatusMap[seatCode];
    const dbStatus = (typeof rawStatus === 'object' && rawStatus !== null) 
      ? rawStatus.status 
      : rawStatus;

    const socket = socketRef.current;
    const isHeldByOthers = heldSeats[seatCode] && heldSeats[seatCode] !== socket?.id;
    const isMyHeldSeat = myHeldSeats.has(seatCode);
    const isSelectedByMe = selectedSeats.find(s => s.id === seatCode);
    
    const isBooked = ['confirmed', 'booked', 'pending_payment'].includes(dbStatus);

    if (isBooked) return 'sold';
    if (isHeldByOthers) return 'held-by-others';
    if (isMyHeldSeat || isSelectedByMe) return 'selected';
    return 'available';
  };

  // --- RENDER ---
  if (loading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;
  if (!trip) return null;

  return (
    <div className="bg-[#f2f4f7] min-h-screen pb-20">
      
      {/* HEADER */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button icon={<ArrowLeftOutlined />} onClick={() => step === 1 ? router.back() : setStep(1)} type="text" />
          <div>
            <h1 className="text-lg font-bold m-0 leading-tight">
              {trip.route?.name || trip.routeId?.name}
            </h1>
            <span className="text-sm text-gray-500">
              {dayjs(trip.departureTime).format('DD/MM/YYYY')} • {trip.bus?.plateNumber || trip.busId?.plateNumber}
            </span>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="max-w-6xl mx-auto p-4">
          <Row gutter={24}>
            
            {/* --- CỘT TRÁI: SƠ ĐỒ GHẾ --- */}
            <Col xs={24} lg={14}>
              <Card 
                title={
                    <div className="flex justify-between items-center">
                        <span>Chọn ghế ({trip.bus?.type || trip.busId?.type})</span>
                        <div className="flex gap-3 text-xs font-normal">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div> Trống
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-600 rounded"></div> Đang chọn
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded"></div> Người khác giữ
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-gray-300 rounded"></div> Đã đặt
                          </div>
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
                          if (!seatCode) {
                            return <div key={`${rowIndex}-${colIndex}`} className="w-10 h-10" />;
                          }

                          const seatStatus = getSeatStatus(seatCode);
                          let seatClass = "w-10 h-10 flex items-center justify-center rounded-t-lg rounded-b-md text-xs font-bold transition-all shadow-sm border cursor-pointer select-none relative ";
                          let tooltipText = `Ghế ${seatCode}`;
                          let isClickable = true;

                          switch(seatStatus) {
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
                                <div 
                                    className={seatClass}
                                    onClick={() => isClickable && handleSelectSeat(seatCode)}
                                >
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
            </Col>

            <Col xs={24} lg={10}>
              <div className="space-y-4">
                <Card title={<><EnvironmentOutlined className="text-green-600 mr-2"/>Điểm đón</>} size="small">
                  {trip.pickupPoints?.length > 0 ? (
                    <Radio.Group 
                      className="w-full flex flex-col gap-2" 
                      value={selectedPickup?._id}
                      onChange={(e) => setSelectedPickup(trip.pickupPoints.find((p:any) => p._id === e.target.value) || null)}
                    >
                      {trip.pickupPoints.map((p: any) => (
                        <Radio key={p._id} value={p._id} className="w-full border p-2 rounded hover:bg-gray-50">
                          <div className="flex justify-between w-full">
                            <span>
                              <span className="font-bold text-blue-600 mr-2">{formatTime(p.computedTime)}</span>
                              {p.name}
                            </span>
                            {p.surcharge > 0 && <Tag color="orange">+{p.surcharge.toLocaleString()}</Tag>}
                          </div>
                          <div className="text-xs text-gray-400 ml-6 truncate" title={p.address}>{p.address}</div>
                        </Radio>
                      ))}
                    </Radio.Group>
                  ) : <Typography.Text type="secondary">Không có thông tin điểm đón</Typography.Text>}
                </Card>

                <Card title={<><EnvironmentOutlined className="text-red-600 mr-2"/>Điểm trả</>} size="small">
                  {trip.dropoffPoints?.length > 0 ? (
                    <Radio.Group 
                      className="w-full flex flex-col gap-2"
                      value={selectedDropoff?._id}
                      onChange={(e) => setSelectedDropoff(trip.dropoffPoints.find((p:any) => p._id === e.target.value) || null)}
                    >
                      {trip.dropoffPoints.map((p: any) => (
                        <Radio key={p._id} value={p._id} className="w-full border p-2 rounded hover:bg-gray-50">
                          <div>
                            <span className="font-bold text-gray-700 mr-2">{formatTime(p.computedTime)}</span>
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-400 ml-6 truncate" title={p.address}>{p.address}</div>
                        </Radio>
                      ))}
                    </Radio.Group>
                  ) : <Typography.Text type="secondary">Không có thông tin điểm trả</Typography.Text>}
                </Card>

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
                      <span>{(selectedSeats.length * trip.basePrice).toLocaleString()} đ</span>
                    </div>
                    {selectedPickup?.surcharge && selectedPickup.surcharge > 0 && (
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
                    onClick={handleNextStep}
                    disabled={selectedSeats.length === 0}
                    className="bg-[#FFC700] text-black border-none hover:!bg-[#e6b400] font-bold h-12 text-lg"
                  >
                    TIẾP TỤC
                  </Button>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    * Ghế sẽ được giữ trong 5 phút để bạn hoàn tất đặt vé
                  </div>
                </Card>

              </div>
            </Col>
          </Row>
        </div>
      )}

      {step === 2 && (
        <BookingCheckoutForm 
          trip={trip}
          selectedSeats={selectedSeats.map(s => s.id)}
          pickupPoint={selectedPickup}
          dropoffPoint={selectedDropoff}
          totalPrice={calculateTotal()}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}