"use client";
import type { Socket } from 'socket.io-client';

import React, { useEffect, useState, use } from 'react';
import {
  Button, Card, List, Tag, message, Popconfirm, Segmented, Spin, Alert
} from 'antd';
import {
  PhoneFilled, CheckCircleFilled, DollarCircleFilled,
  EnvironmentFilled, ArrowLeftOutlined, SyncOutlined, WarningOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { createSocket } from '@/lib/socketClient';
 
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
interface TripInfo {
  departureTime: string;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
  routeId: { name: string };
  busId: { plateNumber: string };
}
 
 
export default function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
 
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
 
  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const resBookings = await fetch(`/api/driver/trips/${id}/bookings`);
      const dataBookings = await resBookings.json();
     
      const resTripInfo = await fetch(`/api/driver/trips/${id}`);
      const dataTripInfo = await resTripInfo.json();
     
      if (dataBookings.success) {
        setBookings(dataBookings.data);
      }
      if (dataTripInfo.success) {
        setTripInfo(dataTripInfo.data);
      }
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
    const socketOrigin = process.env.SOCKET_ORIGIN ;
    const socketInstance = createSocket({ reconnectionAttempts: 5 });
 
    socketInstance.on('connect', () => {
      socketInstance.emit('join_trip', id);
    });
 
    const handleUpdate = (data: any) => {
     
      // OPTIMISTIC UPDATE: Cập nhật state ngay lập tức để giao diện phản hồi nhanh
      // (Phòng trường hợp fetchData bị chậm)
      setBookings(prev => prev.map(b => {
        if (b._id === data.bookingId) {
          return { ...b, status: data.status };
        }
        return b;
      }));
 
      // Sau đó fetch lại để đảm bảo đồng bộ hoàn toàn
      fetchData(true);
    };
 
 
    socketInstance.on('new_booking', (data) => {
      message.info(` Có khách mới đặt ghế: ${data.seatCodes?.join(', ')}`);
      fetchData(true); // Load lại ngầm
    });
 
    socketInstance.on('booking_updated', (data) => {
      fetchData(true); // Load lại ngầm
    });
 
    setSocket(socketInstance);
 
    return () => {
      socketInstance.disconnect();
    };
  }, [id]);
 
  const updateTripStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        message.success(`Đã chuyển sang ${status === 'running' ? 'Đang chạy' : 'Hoàn thành'}`);
        fetchData(true);
      }
    } catch (e) {
      message.error('Lỗi cập nhật');
    }
  };
 
  // Kiểm tra và xử lý khi tài xế muốn bắt đầu chạy
  const handleStart = async () => {
    if (!tripInfo) return message.error('Không có thông tin chuyến');
 
    const now = dayjs();
    const earliestStart = dayjs(tripInfo.departureTime).subtract(5, 'minute');
 
    if (now.isBefore(earliestStart)) {
      return message.warning(
        `Chỉ được bắt đầu chạy tối đa 5 phút trước giờ xuất bến. Vui lòng đợi đến ${earliestStart.format('HH:mm, DD/MM/YYYY')}`
      );
    }
 
    return updateTripStatus('running');
  };
 
  const handleComplete = async () => {
    if (!tripInfo) return message.error('Không có thông tin chuyến');
    const allowedAt = dayjs(tripInfo.departureTime).add(30, 'minute');
    if (dayjs().isBefore(allowedAt)) {
      return message.error(`Không thể hoàn thành trước ${allowedAt.format('HH:mm, DD/MM/YYYY')}`);
    }
    return updateTripStatus('completed');
  };
 
  // Hàm xử lý xác nhận khách lên xe
     const handleBoarding = async (bookingId: string) => {
    try {
      setBookings(prev => prev.map(b =>
        b._id === bookingId ? { ...b, status: 'boarded' } : b
      ));
 
      const res = await fetch(`/api/driver/trips/${id}/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'boarded' })
      });
 
      if (res.ok) {
        message.success('Đã đón khách!');
      } else {
        message.error('Lỗi cập nhật');
        fetchData(true);
      }
    } catch (error) {
      message.error('Lỗi kết nối');
      fetchData(true);
    }
  };
 
   const checkIsLate = () => {
    if (!tripInfo) return { isLate: false, diffMinutes: 0 };
   
    const now = dayjs();
    const departure = dayjs(tripInfo.departureTime);
   
    // Nếu trạng thái vẫn là 'scheduled' và giờ hiện tại > giờ đi
    if (tripInfo.status === 'scheduled' && now.isAfter(departure)) {
      const diffMinutes = now.diff(departure, 'minute');
      // Chỉ cảnh báo nếu trễ quá 5 phút
      if (diffMinutes > 5) {
        return { isLate: true, diffMinutes };
      }
    }
    return { isLate: false, diffMinutes: 0 };
  };
 
  const { isLate, diffMinutes } = checkIsLate();
 
   const confirmPayment = async (bookingId: string) => {
    try {
      setBookings(prev => prev.map(b =>
        b._id === bookingId ? { ...b, status: 'confirmed' } : b
      ));
 
      const res = await fetch('/api/driver/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
     
      if (res.ok) {
        message.success('Đã xác nhận thu tiền');
      } else {
        message.error('Lỗi server');
        fetchData(true);
      }
    } catch (e) {
      message.error('Lỗi kết nối');
      fetchData(true);
    }
  };
 
  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'pending') return b.status === 'pending_payment';
    if (filter === 'paid') return b.status === 'confirmed' || b.status === 'boarded';
    return true;
  });
 
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
          <div className="w-full flex items-center justify-between sm:justify-start gap-2">
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/driver')} type="text" />
            <h2 className="text-lg font-bold flex-1 text-center sm:text-left">
               Hành khách {loading && <Spin indicator={<SyncOutlined spin />} size="small" />}
            </h2>
          </div>
        </div>
        {isLate && (
          <Alert
            message="Chuyến xe đang bị trễ!"
            description={
              <div className="flex flex-col gap-1">
                <span>Đã quá giờ xuất phát <b>{diffMinutes} phút</b>.</span>
                <span className="text-xs">Vui lòng bấm "Bắt đầu chạy" ngay nếu xe đã xuất bến.</span>
              </div>
            }
            type="error"
            showIcon
            icon={<WarningOutlined />}
            className="mb-3 animate-pulse border-red-400 bg-red-50"
            action={
              <Button
                size="small"
                type="primary"
                danger
                onClick={() => handleStart()}
              >
                Bắt đầu ngay
              </Button>
            }
          />
        )}
       
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
           {tripInfo?.status === 'scheduled' && (
             <Popconfirm title="Bắt đầu chạy chuyến này?" onConfirm={() => handleStart()}>
               <Button
                 type="primary"
                 block
                 className={`w-full sm:w-auto ${isLate ? 'bg-red-600 hover:bg-red-500 animate-bounce' : 'bg-blue-600'}`}
               >
                 {isLate ? `BẮT ĐẦU CHẠY (TRỄ ${diffMinutes}P)` : 'Bắt đầu chạy'}
               </Button>
             </Popconfirm>
           )}
           
           {/* Nút Hoàn thành */}
           {tripInfo?.status === 'running' && (
             <Popconfirm title="Xác nhận hoàn thành chuyến?" onConfirm={() => handleComplete()}>
               <Button block danger className="w-full sm:w-auto">Hoàn thành chuyến</Button>
             </Popconfirm>
           )}
        </div>
 
        <div className="mb-2 overflow-x-auto">
          <Segmented
            block
            value={filter}
            onChange={(val: any) => setFilter(val)}
            options={[
              { label: `Tất cả (${bookings.length})`, value: 'all' },
              { label: 'Chưa TT', value: 'pending_payment' },
              { label: 'Đã TT', value: 'paid' },
            ]}
          />
        </div>
      </div>
 
      <div className="p-4 flex-1 overflow-y-auto">
          <List
          loading={loading && bookings.length === 0} // Chỉ hiện loading to khi chưa có dữ liệu lần đầu
          dataSource={filteredBookings}
          renderItem={(item) => (
            <Card className="mb-3 shadow-sm border-0 rounded-lg overflow-hidden" bodyStyle={{ padding: '12px' }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-3">
                <div className="flex gap-2 items-start">
                  <div className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-lg min-w-[40px] sm:min-w-[50px] text-center">
                    {item.seatCodes.join(',')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-800 text-base truncate">{item.customerInfo.name}</div>
                    <a href={`tel:${item.customerInfo.phone}`} className="text-blue-600 flex items-center gap-1 text-sm font-medium mt-0.5 truncate">
                      <PhoneFilled /> {item.customerInfo.phone}
                    </a>
                  </div>
                </div>
                <Tag className="self-start sm:self-auto" color={['confirmed', 'boarded'].includes(item.status) ? 'green' : 'orange'}>
                  {['confirmed', 'boarded'].includes(item.status) ? 'Đã TT' : 'Chưa TT'}
                </Tag>
              </div>
 
              <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 space-y-1 mb-3">
                <div className="flex gap-2 items-center">
                   <EnvironmentFilled className="text-green-600" />
                   <span className="truncate">Đón: <b>{dayjs(item.pickupPoint?.time).format('HH:mm')}</b> - {item.pickupPoint?.name}</span>
                </div>
                <div className="flex gap-2 items-center">
                   <EnvironmentFilled className="text-red-500" />
                   <span className="truncate">Trả: {item.dropoffPoint?.name}</span>
                </div>
                {item.note && (
                  <div className="text-orange-600 italic border-t border-gray-200 pt-1 mt-1">
                    Note: {item.note}
                  </div>
                )}
              </div>
 
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="font-bold text-lg text-gray-700">
                    {item.totalPrice.toLocaleString()} đ
                </div>
             
              {/* CASE 1: Chưa thanh toán -> Hiện nút Thu Tiền */}
              {item.status === 'pending_payment' && (
                <Popconfirm
                    title="Xác nhận đã thu tiền?"
                    onConfirm={() => confirmPayment(item._id)}
                    okText="Đã thu"
                    cancelText="Hủy"
                >
                  <Button type="primary" icon={<DollarCircleFilled />} className="bg-green-600 hover:bg-green-500 border-none shadow-md">
                    Thu tiền
                  </Button>
                </Popconfirm>
              )}
             
              {/* CASE 2: Đã thanh toán (Confirmed) -> Hiện nút Đã Đón */}
              {item.status === 'confirmed' && (
                  <Button
                    type="primary"
                    size="small"
                    className="bg-blue-600"
                    onClick={() => handleBoarding(item._id)}
                  >
                    Đón khách
                  </Button>
              )}
 
              {/* CASE 3: Đã lên xe (Boarded) -> Hiện dấu tích */}
                  {item.status === 'boarded' && (
                      <Tag color="purple" icon={<CheckCircleFilled />}>Đã lên xe</Tag>
                  )}
                </div>
            </Card>
          )}
        />
      </div>
    </div>
  );
}
 