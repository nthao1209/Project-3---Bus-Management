'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Select, DatePicker, Table, Tag, Row, Col, 
  Statistic, Empty, Spin, message, Badge, Tooltip, Button 
} from 'antd';
import { 
  UserOutlined, PhoneOutlined, ClockCircleOutlined, 
  SyncOutlined, CheckCircleOutlined, StopOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';

// --- INTERFACES ---
interface Company {
  _id: string;
  name: string;
}

interface TripOption {
  _id: string;
  routeId: { name: string };
  departureTime: string;
  busId: { plateNumber: string };
}

interface BookingItem {
  _id: string;
  seatCodes: string[];
  customerInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  status: 'pending_payment' | 'confirmed' | 'cancelled';
  totalPrice: number;
  pickupPoint: { name: string; time: string, address: string };
  dropoffPoint: { name: string; address: string };
  createdAt: string;
}

export default function BookingManager() {
  // --- STATE ---
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Filters
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Data Display
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [tripStats, setTripStats] = useState({ total: 0, booked: 0, revenue: 0 });

  // --- 1. INITIAL LOAD & SOCKET SETUP ---
  useEffect(() => {
    // Kết nối Socket chung
    const socketInstance = io({ path: '/socket.io' });
    setSocket(socketInstance);

    // Lấy danh sách nhà xe
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/owner/companies');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setCompanies(data.data);
          setSelectedCompany(data.data[0]._id); // Mặc định chọn nhà xe đầu tiên
        }
      } catch (error) {
        message.error('Lỗi tải danh sách nhà xe');
      }
    };
    fetchCompanies();

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // --- 2. FETCH TRIPS (Khi đổi Ngày hoặc Nhà xe) ---
  useEffect(() => {
    if (!selectedCompany || !selectedDate) return;

    const fetchTrips = async () => {
      setTrips([]);
      setSelectedTripId(null); // Reset chuyến đã chọn
      setBookings([]); // Clear bảng cũ
      
      try {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const res = await fetch(`/api/owner/trips?companyId=${selectedCompany}&date=${dateStr}`);
        const data = await res.json();
        if (data.success) {
          setTrips(data.data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchTrips();
  }, [selectedCompany, selectedDate]);

  // --- 3. FETCH BOOKINGS (Khi chọn Chuyến xe) ---
  const fetchTripDetails = async () => {
    if (!selectedTripId) return;
    
    setLoadingBookings(true);
    try {
      // Gọi API lấy danh sách booking của chuyến này
      const res = await fetch(`/api/owner/bookings/by-trips/${selectedTripId}`);
      const data = await res.json();
      
      if (data.success) {
        setBookings(data.data.bookings);
        // Tính toán thống kê nhanh
        const totalRev = data.data.bookings.reduce((sum: number, b: any) => 
          b.status === 'confirmed' ? sum + b.totalPrice : sum, 0
        );
        const bookedSeats = data.data.bookings.reduce((sum: number, b: any) => 
          ['confirmed', 'pending_payment'].includes(b.status) ? sum + b.seatCodes.length : sum, 0
        );

        setTripStats({
          total: data.data.totalSeats || 40, // Lấy từ API hoặc default
          booked: bookedSeats,
          revenue: totalRev
        });
      }
    } catch (error) {
      message.error('Lỗi tải danh sách vé');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchTripDetails();

    // --- REAL-TIME LOGIC ---
    if (socket && selectedTripId) {
      // Join room riêng của chuyến xe này
      console.log(`🔌 Joining room: trip_${selectedTripId}`);
      socket.emit('join_trip_room', selectedTripId);

      // Lắng nghe sự kiện booking mới hoặc thay đổi trạng thái
      const handleUpdate = (data: any) => {
        console.log('⚡ Realtime update received:', data);
        message.info('Dữ liệu chuyến xe vừa được cập nhật');
        fetchTripDetails(); // Reload lại dữ liệu mới nhất
      };

      socket.on('booking_updated', handleUpdate);
      socket.on('new_booking', handleUpdate);

      return () => {
        console.log(`🔌 Leaving room: trip_${selectedTripId}`);
        socket.emit('leave_trip_room', selectedTripId);
        socket.off('booking_updated');
        socket.off('new_booking');
      };
    }
  }, [selectedTripId, socket]); // Chạy lại khi đổi chuyến

  // --- HELPER RENDERS ---
  const columns = [
    {
      title: 'Ghế',
      dataIndex: 'seatCodes',
      key: 'seats',
      width: 100,
      render: (seats: string[]) => (
        <div className="flex flex-wrap gap-1">
          {seats.map(s => <Tag color="blue" key={s}>{s}</Tag>)}
        </div>
      )
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: BookingItem) => (
        <div className="flex flex-col">
          <span className="font-medium flex items-center gap-1">
            <UserOutlined /> {record.customerInfo.name}
          </span>
          <span className="text-gray-500 text-xs flex items-center gap-1">
            <PhoneOutlined /> {record.customerInfo.phone}
          </span>
        </div>
      )
    },
    {
      title: 'Điểm đón/trả',
      key: 'points',
      render: (_: any, record: BookingItem) => (
        <div className="text-xs">
          <div className="text-green-700">
             <span className="font-bold">Đón:</span> {dayjs(record.pickupPoint.time).format('HH:mm')} - {record.pickupPoint.name} - {record.pickupPoint.address}
          </div>
          <div className="text-orange-700 mt-1">
             <span className="font-bold">Trả:</span> {record.dropoffPoint.name}- {record.dropoffPoint.address}
          </div>
        </div>
      )
    },
    {
      title: 'Thanh toán',
      dataIndex: 'totalPrice',
      key: 'price',
      render: (price: number) => <span className="font-semibold">{price.toLocaleString()}đ</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => {
        const config: any = {
          confirmed: { color: 'success', text: 'Đã thanh toán', icon: <CheckCircleOutlined /> },
          pending_payment: { color: 'warning', text: 'Giữ chỗ', icon: <ClockCircleOutlined /> },
          cancelled: { color: 'error', text: 'Đã hủy', icon: <StopOutlined /> },
        };
        const s = config[status] || { color: 'default', text: status };
        return <Tag icon={s.icon} color={s.color}>{s.text}</Tag>;
      }
    },
    {
      title: 'Thời gian đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => <span className="text-gray-400 text-xs">{dayjs(date).format('DD/MM HH:mm')}</span>
    }
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Đặt vé</h2>
        <p className="text-gray-500">Theo dõi trạng thái ghế và hành khách theo thời gian thực.</p>
      </div>

      <Card className="mb-6 shadow-sm border-0" bodyStyle={{ padding: '16px 24px' }}>
        <Row gutter={[16, 16]} align="middle">
          
          <Col xs={24} md={6}>
            <div className="text-xs font-semibold text-gray-500 mb-1">NHÀ XE</div>
            <Select
              className="w-full"
              placeholder="Chọn nhà xe"
              options={companies.map(c => ({ label: c.name, value: c._id }))}
              value={selectedCompany}
              onChange={setSelectedCompany}
            />
          </Col>

          <Col xs={24} md={6}>
            <div className="text-xs font-semibold text-gray-500 mb-1">NGÀY ĐI</div>
            <DatePicker 
              className="w-full"
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              format="DD/MM/YYYY"
              allowClear={false}
            />
          </Col>

          <Col xs={24} md={12}>
            <div className="text-xs font-semibold text-gray-500 mb-1">CHỌN CHUYẾN XE</div>
            <Select
              className="w-full"
              placeholder={trips.length === 0 ? "Không có chuyến nào trong ngày này" : "Chọn chuyến xe..."}
              disabled={trips.length === 0}
              value={selectedTripId}
              onChange={setSelectedTripId}
              options={trips.map(t => ({
                value: t._id,
                label: `${dayjs(t.departureTime).format('HH:mm')} - ${t.routeId.name} (${t.busId.plateNumber})`
              }))}
            />
          </Col>
        </Row>
      </Card>

      {selectedTripId ? (
        <div className="animate-fade-in">
          {/* 2. THỐNG KÊ NHANH */}
          <Row gutter={16} className="mb-4">
            <Col span={8}>
              <Card bordered={false} className="shadow-sm bg-blue-50">
                <Statistic 
                  title="Ghế đã đặt / Tổng số" 
                  value={tripStats.booked} 
                  suffix={`/ ${tripStats.total}`} 
                  valueStyle={{ color: '#2563eb' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm bg-green-50">
                <Statistic 
                  title="Doanh thu chuyến" 
                  value={tripStats.revenue} 
                  precision={0} 
                  suffix="₫"
                  valueStyle={{ color: '#16a34a' }} 
                />
              </Card>
            </Col>
            <Col span={8}>
               <Card bordered={false} className="shadow-sm flex items-center justify-center h-full cursor-pointer hover:bg-gray-50" onClick={fetchTripDetails}>
                  <div className="text-center text-gray-500">
                    <SyncOutlined spin={loadingBookings} className="text-xl mb-1 block" />
                    Làm mới dữ liệu
                  </div>
               </Card>
            </Col>
          </Row>

          <Card 
            title={
              <div className="flex items-center gap-2">
                 <span>Danh sách vé đặt</span>
                 <Badge status="processing" text="Real-time" />
              </div>
            } 
            className="shadow-sm"
          >
            <Table
              rowKey="_id"
              columns={columns}
              dataSource={bookings}
              loading={loadingBookings}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Chưa có vé nào được đặt cho chuyến này' }}
            />
          </Card>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-lg border border-dashed border-gray-300 text-gray-400">
           <Empty description="Vui lòng chọn Nhà xe, Ngày và Chuyến xe để xem dữ liệu" />
        </div>
      )}
    </div>
  );
}