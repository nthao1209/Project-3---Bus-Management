'use client';

import { useState, useEffect, use, useRef } from 'react';
import { Spin, message, Row, Col, Button, Drawer } from 'antd';
import { useRouter } from 'next/navigation';
import { EnvironmentOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { createSocket } from '@/lib/socketClient';
import { Socket } from 'socket.io-client';

import TripHeader from '@/components/booking/TripHeader';
import SeatMap from '@/components/booking/SeatMap';
import PointSelector from '@/components/booking/PointSelector';
import BookingSummary from '@/components/booking/BookingSummary';
import BookingCheckoutForm from '@/components/BookingCheckoutForm';

// Hàm format tiền tệ
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<any>(null);
  const [selectedDropoff, setSelectedDropoff] = useState<any>(null);
  const [seatSchema, setSeatSchema] = useState<string[][]>([]);
  const [seatStatusMap, setSeatStatusMap] = useState<Record<string, any>>({});
  
  // State cho Mobile Drawer (Xem chi tiết giá trên mobile)
  const [openMobileDetail, setOpenMobileDetail] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const [heldSeats, setHeldSeats] = useState<Record<string, string>>({});
  const [myHeldSeats, setMyHeldSeats] = useState<Set<string>>(new Set());

  // ... (Giữ nguyên logic handleBookingSuccess, useEffect socket, useEffect fetchTrip)
  // --- PHẦN LOGIC GIỮ NGUYÊN (Copy từ code cũ của bạn vào đây nếu cần, tôi ẩn đi để gọn code) ---
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
    socketRef.current = createSocket();
    const socket = socketRef.current;

    socket.on('connect', () => { socket.emit('join_trip', tripId); });

    socket.on('seat_held', ({ seatCode, socketId }: any) => {
      setHeldSeats(prev => ({ ...prev, [seatCode]: socketId }));
      if (socketId === socket.id) {
        setMyHeldSeats(prev => new Set(prev).add(seatCode));        
        setSelectedSeats(prev => prev.some(s => s.id === seatCode) ? prev : [...prev, { id: seatCode, price: trip?.basePrice || 0, status: 'selected' }]);
      }
      setSeatStatusMap(prev => ({ ...prev, [seatCode]: { status: 'holding', socketId } }));
    });

    socket.on('seat_released', ({ seatCode, socketId }: any) => {
      setSeatStatusMap(prev => { const newMap = { ...prev }; newMap[seatCode] = { status: 'available' }; return newMap; });
      setHeldSeats(prev => { const newState = { ...prev }; delete newState[seatCode]; return newState; });
      if (socketId === socket.id || socketId === 'force_sync') {
        setMyHeldSeats(prev => { const newSet = new Set(prev); newSet.delete(seatCode); return newSet; });
        setSelectedSeats(prev => prev.filter(s => s.id !== seatCode));
      }
    });
    
    socket.on('seat_auto_released', ({ seatCode }: any) => {
      message.info(`Ghế ${seatCode} hết thời gian giữ`);
      setHeldSeats(prev => { const n = { ...prev }; delete n[seatCode]; return n; });
      setMyHeldSeats(prev => { const n = new Set(prev); n.delete(seatCode); return n; });
      setSeatStatusMap(prev => { const n = { ...prev }; delete n[seatCode]; return n; });
      setSelectedSeats(prev => prev.filter(s => s.id !== seatCode));
    });

    socket.on('sync_seat_status', (serverHeldSeats: any) => {
      const simpleMap: Record<string, string> = {};
      const mySeats = new Set<string>();
      Object.keys(serverHeldSeats).forEach(key => {
        simpleMap[key] = serverHeldSeats[key].socketId;
        if (serverHeldSeats[key].socketId === socket.id) {
          mySeats.add(key);
          setSelectedSeats(prev => prev.some(s => s.id === key) ? prev : [...prev, { id: key, price: trip?.basePrice || 0, status: 'selected' }]);
        }
      });
      setHeldSeats(simpleMap);
      setMyHeldSeats(mySeats);
    });
    socket.on('error_message', (msg: string) => message.error(msg));
    return () => {
      myHeldSeats.forEach(seatCode => socket?.emit('release_seat', { tripId, seatCode }));
      if (socket) socket.disconnect();
    };
  }, [tripId, trip?.basePrice]); 

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const res = await fetch(`/api/users/trips/${tripId}`);
        const json = await res.json();
        if (json.success) {
          const data = json.data;
          setTrip(data);
          if (data.pickupPoints?.length > 0) setSelectedPickup(data.pickupPoints[0]);
          if (data.dropoffPoints?.length > 0) setSelectedDropoff(data.dropoffPoints[0]);
          const busLayout = data.bus?.seatLayout || data.busId?.seatLayout;
          let schema = busLayout?.schema || [];
          if (!Array.isArray(schema) || schema.length === 0) {
            const total = busLayout?.totalSeats || 40;
            let row: string[] = [];
            for(let i=1; i<=total; i++) {
                row.push(`${i.toString().padStart(2,'0')}`);
                if(row.length === 4 || i === total) { schema.push(row); row = []; }
            }
          }
          setSeatSchema(schema);
          setSeatStatusMap(data.seatsStatus || {});
          if (socketRef.current?.connected) socketRef.current.emit('sync_seat_status', tripId);
        } else {
          message.error('Không tìm thấy chuyến đi'); router.push('/');
        }
      } catch (error) { console.error(error); message.error('Lỗi kết nối'); } finally { setLoading(false); }
    };
    fetchTrip();
  }, [tripId, router]);
  // --- KẾT THÚC PHẦN LOGIC GIỮ NGUYÊN ---

  const handleSelectSeat = (seatCode: string) => {
    if (!seatCode || !socketRef.current) return;
    const socket = socketRef.current;
    
    const rawStatus = seatStatusMap[seatCode];
    const dbStatus = rawStatus?.status; 
    const heldByMySocket = rawStatus?.socketId === socket.id;
    const isSelectedLocally = selectedSeats.some(s => s.id === seatCode);

    if (isSelectedLocally || heldByMySocket) {
        socket.emit('release_seat', { tripId, seatCode });
        setSelectedSeats(prev => prev.filter(s => s.id !== seatCode));
        setMyHeldSeats(prev => { const n = new Set(prev); n.delete(seatCode); return n; });
    } else {
        if (['booked', 'sold', 'confirmed'].includes(dbStatus)) return message.warning('Ghế đã bán');
        if (dbStatus === 'holding' && !heldByMySocket) return message.warning('Ghế người khác đang giữ');
        if (selectedSeats.length >= 5) return message.warning('Tối đa 5 ghế');

        socket.emit('hold_seat', { tripId, seatCode });
        setSelectedSeats(prev => [...prev, { id: seatCode, price: trip.basePrice, status: 'selected' }]);
        setMyHeldSeats(prev => new Set([...prev, seatCode]));
    }
  };

  const handleNextStep = () => {
    if (selectedSeats.length === 0) return message.error('Vui lòng chọn ghế');
    if (!selectedPickup?._id || !selectedDropoff?._id) return message.error('Vui lòng chọn điểm đón/trả');
    setStep(2);
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  if (loading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;
  if (!trip) return null;

  return (
    // Thêm padding bottom (pb-24) để nội dung không bị che bởi thanh Sticky Footer trên mobile
    <div className="bg-[#f2f4f7] min-h-screen pb-28 md:pb-10">
      
      <TripHeader trip={trip} step={step} setStep={setStep} />

      {step === 1 && (
        <div className="max-w-6xl mx-auto p-3 md:p-4">
          {/* Sử dụng gutter mảng [x, y] để có khoảng cách tốt trên mobile */}
          <Row gutter={[16, 24]}>
            
            {/* Cột Ghế: Trên mobile chiếm full (24), Desktop chiếm 14 */}
            <Col xs={24} lg={14}>
              <div className="bg-white p-4 rounded-xl shadow-sm overflow-hidden">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Chọn ghế</h3>
                {/* Wrapper để scroll ngang nếu sơ đồ ghế quá rộng trên màn hình bé */}
                <div className="overflow-x-auto pb-2 flex justify-center">
                  <SeatMap 
                    busType={trip.bus?.type || trip.busId?.type}
                    seatSchema={seatSchema}
                    seatStatusMap={seatStatusMap}
                    heldSeats={heldSeats}
                    myHeldSeats={myHeldSeats}
                    selectedSeats={selectedSeats}
                    socketId={socketRef.current?.id}
                    onSelectSeat={handleSelectSeat}
                  />
                </div>
                {/* Chú thích ghế rút gọn cho mobile */}
                <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs text-gray-500">
                   <div className="flex items-center"><div className="w-4 h-4 rounded border bg-white mr-1"></div> Trống</div>
                   <div className="flex items-center"><div className="w-4 h-4 rounded bg-blue-500 mr-1"></div> Đang chọn</div>
                   <div className="flex items-center"><div className="w-4 h-4 rounded bg-gray-300 mr-1"></div> Đã bán</div>
                </div>
              </div>
            </Col>

            {/* Cột Điểm đón/trả & Summary (Desktop) */}
            <Col xs={24} lg={10}>
              <div className="space-y-4">
                
                {/* Điểm đón/trả */}
                <div className="bg-white rounded-xl shadow-sm p-1">
                  <PointSelector 
                    title={<div className="font-semibold text-base"><EnvironmentOutlined className="text-green-600 mr-2"/>Điểm đón</div>}
                    points={trip.pickupPoints}
                    selectedId={selectedPickup?._id}
                    onSelect={setSelectedPickup}
                    timeClass="text-blue-600 font-bold"
                  />
                  <div className="border-t border-dashed my-1 mx-4"></div>
                  <PointSelector 
                    title={<div className="font-semibold text-base"><EnvironmentOutlined className="text-red-600 mr-2"/>Điểm trả</div>}
                    points={trip.dropoffPoints}
                    selectedId={selectedDropoff?._id}
                    onSelect={setSelectedDropoff}
                    timeClass="text-gray-700 font-bold"
                  />
                </div>

                {/* BookingSummary chỉ hiện trên Desktop (lg:block hidden) */}
                <div className="hidden lg:block">
                  <BookingSummary 
                    selectedSeats={selectedSeats}
                    basePrice={trip.basePrice}
                    onNext={handleNextStep}
                  />
                </div>
              </div>
            </Col>
          </Row>

          {/* --- MOBILE STICKY FOOTER --- */}
          {/* Chỉ hiện trên mobile/tablet (lg:hidden) */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t z-50 lg:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.1)] px-4 py-3 safe-area-pb">
            <div className="flex justify-between items-center">
              <div 
                className="flex flex-col cursor-pointer" 
                onClick={() => setOpenMobileDetail(true)}
              >
                <span className="text-gray-500 text-xs flex items-center">
                  {selectedSeats.length} ghế <ShoppingCartOutlined className="ml-1 text-[10px]"/>
                </span>
                <span className="text-blue-600 font-bold text-lg">
                  {formatCurrency(totalPrice)}
                </span>
                <span className="text-[10px] text-blue-400 underline">Chi tiết</span>
              </div>
              
              <Button 
                type="primary" 
                size="large" 
                onClick={handleNextStep}
                disabled={selectedSeats.length === 0}
                className="w-1/2 h-12 text-base font-semibold shadow-md bg-blue-600 hover:bg-blue-700"
              >
                Tiếp tục
              </Button>
            </div>
          </div>

          {/* Drawer chi tiết vé trên Mobile */}
          <Drawer
            title="Chi tiết đặt vé"
            placement="bottom"
            onClose={() => setOpenMobileDetail(false)}
            open={openMobileDetail}
            height="60vh"
          >
             <div className="space-y-4">
               <div>
                 <h4 className="font-medium text-gray-600">Ghế đã chọn:</h4>
                 <div className="flex flex-wrap gap-2 mt-2">
                   {selectedSeats.length > 0 ? selectedSeats.map(s => (
                     <span key={s.id} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                       Ghế {s.id}
                     </span>
                   )) : <span className="text-gray-400">Chưa chọn ghế nào</span>}
                 </div>
               </div>
               
               <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Đơn giá:</span>
                    <span>{formatCurrency(trip.basePrice)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-blue-600 border-t pt-2 mt-2">
                    <span>Tổng cộng:</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
               </div>

               <div className="bg-gray-50 p-3 rounded text-sm text-gray-500">
                  <p>Điểm đón: {selectedPickup?.time} - {selectedPickup?.location}</p>
                  <p className="mt-1">Điểm trả: {selectedDropoff?.time} - {selectedDropoff?.location}</p>
               </div>
             </div>
          </Drawer>

        </div>
      )}

      {step === 2 && (
        <div className="max-w-3xl mx-auto p-4">
          <BookingCheckoutForm 
            trip={trip}
            selectedSeats={selectedSeats.map(s => s.id)}
            pickupPoint={selectedPickup}
            dropoffPoint={selectedDropoff}
            totalPrice={totalPrice}
            onSuccess={handleBookingSuccess}
          />
           {/* Nút Back cho mobile nếu cần */}
           <div className="mt-4 text-center lg:hidden">
              <Button type="link" onClick={() => setStep(1)}>Quay lại chọn ghế</Button>
           </div>
        </div>
      )}
    </div>
  );
}
