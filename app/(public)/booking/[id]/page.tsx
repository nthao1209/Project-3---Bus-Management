'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import { Spin, message, Row, Col } from 'antd';
import { useRouter } from 'next/navigation';
import { EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';

// Import Components
import TripHeader from '@/components/booking/TripHeader';
import SeatMap from '@/components/booking/SeatMap';
import PointSelector from '@/components/booking/PointSelector';
import BookingSummary from '@/components/booking/BookingSummary';
import BookingCheckoutForm from '@/components/BookingCheckoutForm';

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = use(params);
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);
  const [step, setStep] = useState(1); 
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<any>(null);
  const [selectedDropoff, setSelectedDropoff] = useState<any>(null);
  const [seatSchema, setSeatSchema] = useState<string[][]>([]); 
  const [seatStatusMap, setSeatStatusMap] = useState<Record<string, any>>({});
  
  // Socket State
  const socketRef = useRef<Socket | null>(null);
  const [heldSeats, setHeldSeats] = useState<Record<string, string>>({}); 
  const [myHeldSeats, setMyHeldSeats] = useState<Set<string>>(new Set());

  // --- LOGIC SOCKET & DATA (Giữ nguyên logic đã fix của bạn) ---
  
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
      setHeldSeats(prev => ({ ...prev, [seatCode]: socketId }));
      if (socketId === socket.id) {
        setMyHeldSeats(prev => new Set(prev).add(seatCode));        
        setSelectedSeats(prev => prev.some(s => s.id === seatCode) ? prev : [...prev, { id: seatCode, price: trip?.basePrice || 0, status: 'selected' }]);
      }
      setSeatStatusMap(prev => ({ ...prev, [seatCode]: { status: 'holding', socketId } }));
    });

    socket.on('seat_released', ({ seatCode, socketId }: any) => {
      setSeatStatusMap(prev => {
        const newMap = { ...prev };
        newMap[seatCode] = { status: 'available' }; 
        return newMap;
      });
      setHeldSeats(prev => {
        const newState = { ...prev };
        delete newState[seatCode];
        return newState;
      });

      if (socketId === socket.id || socketId === 'force_sync') {
        setMyHeldSeats(prev => {
          const newSet = new Set(prev);
          newSet.delete(seatCode);
          return newSet;
        });
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
          // Xử lý layout ghế
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
    
    // ✅ Kiểm tra chặt chẽ hơn: phải có _id (không chỉ kiểm tra truthy)
    if (!selectedPickup?._id || !selectedDropoff?._id) {
      return message.error('Vui lòng chọn điểm đón/trả');
    }
    
    setStep(2);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;
  if (!trip) return null;

  return (
    <div className="bg-[#f2f4f7] min-h-screen pb-20">
      
      <TripHeader trip={trip} step={step} setStep={setStep} />

      {step === 1 && (
        <div className="max-w-6xl mx-auto p-4">
          <Row gutter={24}>
            
            <Col xs={24} lg={14}>
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
            </Col>

            <Col xs={24} lg={10}>
              <div className="space-y-4">
                
                <PointSelector 
                  title={<><EnvironmentOutlined className="text-green-600 mr-2"/>Điểm đón</>}
                  points={trip.pickupPoints}
                  selectedId={selectedPickup?._id}
                  onSelect={setSelectedPickup}
                  timeClass="text-blue-600"
                />

                <PointSelector 
                  title={<><EnvironmentOutlined className="text-red-600 mr-2"/>Điểm trả</>}
                  points={trip.dropoffPoints}
                  selectedId={selectedDropoff?._id}
                  onSelect={setSelectedDropoff}
                  timeClass="text-gray-700"
                />

                <BookingSummary 
                  selectedSeats={selectedSeats}
                  basePrice={trip.basePrice}
                  selectedPickup={selectedPickup}
                  onNext={handleNextStep}
                />

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
          totalPrice={selectedSeats.reduce((sum, s) => sum + s.price, 0) + (selectedPickup?.surcharge || 0) * selectedSeats.length}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
