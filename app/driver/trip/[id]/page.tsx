'use client';

import React, { useEffect, useState, use } from 'react';
import { 
  Button, Card, List, Tag, message, Popconfirm, Segmented, Spin 
} from 'antd';
import { 
  PhoneFilled, CheckCircleFilled, DollarCircleFilled, 
  EnvironmentFilled, ArrowLeftOutlined, SyncOutlined 
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
// 1. Import Socket.io client
import { io, Socket } from 'socket.io-client';

interface Booking {
  _id: string;
  seatCodes: string[];
  customerInfo: { name: string; phone: string };
  totalPrice: number;
  status: 'pending_payment' | 'confirmed' | 'boarded' | 'cancelled';
  pickupPoint: { name: string; time: string };
  dropoffPoint: { name: string };
  note?: string;
}

export default function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const router = useRouter();
  
  // State socket
  const [socket, setSocket] = useState<Socket | null>(null);

  // Hàm load dữ liệu (Tách ra để tái sử dụng)
  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const resBookings = await fetch(`/api/driver/trips/${id}/bookings`);
      const dataBookings = await resBookings.json();
      
      if (dataBookings.success) {
        setBookings(dataBookings.data);
      }
    } catch (err) {
      console.error(err);
      if (!isBackground) message.error('Lỗi tải dữ liệu');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // --- LOGIC REALTIME Ở ĐÂY ---
  useEffect(() => {
    // 1. Load dữ liệu lần đầu
    fetchData();

    // 2. Khởi tạo Socket
    const socketInstance = io({ path: '/socket.io' });

    socketInstance.on('connect', () => {
      console.log('Driver connected to socket');
      // 3. Tham gia vào room của chuyến đi này
      // Tên room thống nhất là: `trip_{tripId}`
      socketInstance.emit('join_trip_room', id);
    });

    // 4. Lắng nghe sự kiện: Có khách đặt mới / Hủy vé
    socketInstance.on('new_booking', (data) => {
      message.info(`🔔 Có khách mới đặt ghế: ${data.seatCodes?.join(', ')}`);
      fetchData(true); // Load lại ngầm
    });

    // 5. Lắng nghe sự kiện: Cập nhật trạng thái (VD: Owner xác nhận tiền)
    socketInstance.on('booking_updated', (data) => {
      // Có thể hiện thông báo hoặc không, tùy nhu cầu
      console.log('Booking updated:', data);
      fetchData(true); // Load lại ngầm
    });

    setSocket(socketInstance);

    // Cleanup khi thoát trang
    return () => {
      socketInstance.disconnect();
    };
  }, [id]);
  // -----------------------------

  const updateTripStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        message.success(`Đã chuyển sang ${status === 'running' ? 'Đang chạy' : 'Hoàn thành'}`);
        router.refresh();
      }
    } catch (e) {
      message.error('Lỗi cập nhật');
    }
  };

  const confirmPayment = async (bookingId: string) => {
    try {
      const res = await fetch('/api/driver/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      if (res.ok) {
        message.success('Đã xác nhận thu tiền');
        // Không cần setBookings thủ công nữa vì socket sẽ trả về event 'booking_updated' 
        // và tự trigger fetchData(true). Tuy nhiên để UX mượt hơn (instant feedback), ta vẫn có thể set:
        setBookings(prev => prev.map(b => 
          b._id === bookingId ? { ...b, status: 'confirmed' } : b
        ));
      } else {
        message.error('Lỗi server');
      }
    } catch (e) {
      message.error('Lỗi kết nối');
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'pending') return b.status === 'pending_payment';
    if (filter === 'confirmed') return b.status === 'confirmed';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/driver')} type="text" />
          <h2 className="text-lg font-bold flex-1">
             Hành khách {loading && <Spin indicator={<SyncOutlined spin />} size="small" />}
          </h2>
        </div>
        
        <div className="flex gap-2 mb-2">
           <Popconfirm title="Bắt đầu chạy chuyến này?" onConfirm={() => updateTripStatus('running')}>
             <Button type="primary" block className="bg-blue-600">Bắt đầu chạy</Button>
           </Popconfirm>
           <Popconfirm title="Xác nhận hoàn thành chuyến?" onConfirm={() => updateTripStatus('completed')}>
             <Button block danger>Hoàn thành</Button>
           </Popconfirm>
        </div>

        <Segmented
          block
          value={filter}
          onChange={(val: any) => setFilter(val)}
          options={[
            { label: `Tất cả (${bookings.length})`, value: 'all' },
            { label: 'Chưa TT', value: 'pending' },
            { label: 'Đã TT', value: 'confirmed' },
          ]}
        />
      </div>

      {/* LIST */}
      <div className="p-4 flex-1 overflow-y-auto">
        <List
          loading={loading && bookings.length === 0} // Chỉ hiện loading to khi chưa có dữ liệu lần đầu
          dataSource={filteredBookings}
          renderItem={(item) => (
            <Card className="mb-3 shadow-sm border-0 rounded-lg overflow-hidden" bodyStyle={{ padding: '12px' }}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-2">
                  <div className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-lg min-w-[50px] text-center">
                    {item.seatCodes.join(',')}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-base">{item.customerInfo.name}</div>
                    <a href={`tel:${item.customerInfo.phone}`} className="text-blue-600 flex items-center gap-1 text-sm font-medium mt-0.5">
                      <PhoneFilled /> {item.customerInfo.phone}
                    </a>
                  </div>
                </div>
                <Tag color={item.status === 'confirmed' ? 'green' : 'orange'}>
                   {item.status === 'confirmed' ? 'Đã TT' : 'Chưa TT'}
                </Tag>
              </div>

              <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 space-y-1 mb-3">
                <div className="flex gap-2">
                   <EnvironmentFilled className="text-green-600" /> 
                   <span>Đón: <b>{dayjs(item.pickupPoint?.time).format('HH:mm')}</b> - {item.pickupPoint?.name}</span>
                </div>
                <div className="flex gap-2">
                   <EnvironmentFilled className="text-red-500" /> 
                   <span>Trả: {item.dropoffPoint?.name}</span>
                </div>
                {item.note && (
                  <div className="text-orange-600 italic border-t border-gray-200 pt-1 mt-1">
                    Note: {item.note}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                 <div className="font-bold text-lg text-gray-700">
                    {item.totalPrice.toLocaleString()} đ
                 </div>
                 
                 {item.status === 'pending_payment' && (
                   <Popconfirm 
                      title="Xác nhận đã thu tiền mặt?" 
                      description={`Số tiền: ${item.totalPrice.toLocaleString()}đ`}
                      onConfirm={() => confirmPayment(item._id)}
                      okText="Đã thu"
                      cancelText="Hủy"
                   >
                     <Button type="primary" icon={<DollarCircleFilled />} className="bg-green-600 hover:bg-green-500 border-none shadow-md">
                       Thu tiền
                     </Button>
                   </Popconfirm>
                 )}
                 
                 {item.status === 'confirmed' && (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                       <CheckCircleFilled /> Xong
                    </span>
                 )}
              </div>
            </Card>
          )}
        />
      </div>
    </div>
  );
}