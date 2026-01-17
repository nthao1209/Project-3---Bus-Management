'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, Select, DatePicker, Table, Tag, Row, Col, 
  Statistic, Empty, message, Badge, Popover, Rate, Grid, List 
} from 'antd';
import { 
  UserOutlined, PhoneOutlined, ClockCircleOutlined, 
  SyncOutlined, CheckCircleOutlined, StopOutlined,StarFilled, 
  EnvironmentOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';

const { useBreakpoint } = Grid;

// ... (Giữ nguyên các Interface: Company, TripOption, BookingItem)
interface Company { _id: string; name: string; }
interface TripOption { _id: string; routeId: { name: string }; departureTime: string; busId: { plateNumber: string }; }
interface BookingItem {
  _id: string;
  seatCodes: string[];
  customerInfo: { name: string; phone: string; email?: string; };
  status: 'pending_payment' | 'confirmed' | 'cancelled'| 'boarded';
  totalPrice: number;
  pickupPoint: { name: string; time: string, address: string };
  dropoffPoint: { name: string; address: string };
  review?: { rating: number; comment: string; createdAt: string; } | null;
  createdAt: string;
}

export default function BookingManager() {
  const screens = useBreakpoint(); // Hook check mobile
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [tripStats, setTripStats] = useState({ total: 0, booked: 0, revenue: 0, rating: 0, reviewCount: 0 });

  // ... (GIỮ NGUYÊN LOGIC FETCH API, USEEFFECT) ... 
  // Copy lại phần useEffect connect socket, fetchCompanies, fetchTrips, fetchTripDetails từ code cũ của bạn
  useEffect(() => {
    const socketOrigin = process.env.SOCKET_ORIGIN ;
    const socketInstance = io(socketOrigin, { path: '/socket.io', transports: ['websocket'] });
    setSocket(socketInstance);
    const fetchCompanies = async () => {
      try {
        const res = await fetch('/api/owner/companies');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setCompanies(data.data);
          setSelectedCompany(data.data[0]._id);
        }
      } catch (error) {}
    };
    fetchCompanies();
    return () => { socketInstance.disconnect(); };
  }, []);

  useEffect(() => {
    if (!selectedCompany || !selectedDate) return;
    const fetchTrips = async () => {
      setTrips([]); setSelectedTripId(null); setBookings([]); 
      try {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const res = await fetch(`/api/owner/trips?companyId=${selectedCompany}&date=${dateStr}`);
        const data = await res.json();
        if (data.success) setTrips(data.data);
      } catch (error) {}
    };
    fetchTrips();
  }, [selectedCompany, selectedDate]);

  const fetchTripDetails = async () => {
    if (!selectedTripId) return;
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/owner/bookings/by-trips/${selectedTripId}`);
      const data = await res.json();
      if (data.success) {
        const bookingList = data.data.bookings;
        setBookings(bookingList);
        const bookedSeats = bookingList.reduce((sum: number, b: any) => ['confirmed', 'boarded'].includes(b.status) ? sum + b.seatCodes.length : sum, 0);
        const totalRevenue = bookingList.reduce((sum: number, b: any) => b.status === 'boarded' ? sum + b.totalPrice : sum, 0);
        setTripStats({
          total: data.data.totalSeats || 40,
          booked: bookedSeats,
          revenue: totalRevenue,
          rating: data.data.averageRating || 0,  
          reviewCount: data.data.totalReviews || 0 
        });
      }
    } catch (error) { message.error('Lỗi tải danh sách vé'); } finally { setLoadingBookings(false); }
  };

  useEffect(() => {
    fetchTripDetails();
    if (!socket || !selectedTripId) return;
    socket.emit('join_trip', selectedTripId);
    const handleUpdate = () => { message.info('Dữ liệu cập nhật'); fetchTripDetails(); };
    socket.on('booking_updated', handleUpdate);
    socket.on('new_booking', handleUpdate);
    return () => { socket.off('booking_updated', handleUpdate); socket.off('new_booking', handleUpdate); };
  }, [selectedTripId, socket]);
  // ... END LOGIC ...

  // Column cho PC (Giữ nguyên)
  const columns = [
    { title: 'Ghế', dataIndex: 'seatCodes', key: 'seats', width: 80, render: (seats: string[]) => <div className="flex flex-wrap gap-1">{seats.map(s => <Tag color="blue" key={s} className="m-0 text-xs">{s}</Tag>)}</div> },
    {
      title: 'Khách hàng', key: 'customer', render: (_: any, r: BookingItem) => (
        <div className="flex flex-col">
          <span className="font-medium flex items-center gap-1"><UserOutlined /> {r.customerInfo.name}</span>
          <span className="text-gray-500 text-xs flex items-center gap-1"><PhoneOutlined /> {r.customerInfo.phone}</span>
        </div>
      )
    },
    {
      title: 'Điểm đón/trả', key: 'points', render: (_: any, r: BookingItem) => (
        <div className="text-xs max-w-[200px]">
          <div className="text-green-700 truncate"><span className="font-bold">Đón:</span> {dayjs(r.pickupPoint.time).format('HH:mm')} - {r.pickupPoint.name}</div>
          <div className="text-orange-700 mt-1 truncate"><span className="font-bold">Trả:</span> {r.dropoffPoint.name}</div>
        </div>
      )
    },
    { title: 'Tiền', dataIndex: 'totalPrice', key: 'price', width: 100, render: (p: number) => <span className="font-semibold text-green-600">{p.toLocaleString()}đ</span> },
    {
      title: 'TT', dataIndex: 'status', key: 'status', width: 110, render: (st: string) => {
        const map: any = { confirmed: { c: 'success', t: 'Đã TT' }, pending_payment: { c: 'warning', t: 'Giữ chỗ' }, boarded: { c: 'processing', t: 'Lên xe' }, cancelled: { c: 'error', t: 'Hủy' } };
        const s = map[st] || { c: 'default', t: st };
        return <Tag color={s.c}>{s.t}</Tag>;
      }
    },
    {
        title: 'Đánh giá', key: 'review', width: 80, render: (_:any, r: BookingItem) => r.review ? <Popover title="Chi tiết" content={r.review.comment}><Tag color="gold"><StarFilled/> {r.review.rating}</Tag></Popover> : <span className="text-xs text-gray-300">-</span>
    }
  ];

  // --- RENDER MOBILE ITEM ---
  const renderMobileBookingItem = (item: BookingItem) => {
    const statusMap: any = { confirmed: { color: 'green', text: 'Đã TT' }, pending_payment: { color: 'orange', text: 'Giữ chỗ' }, boarded: { color: 'blue', text: 'Đã lên xe' }, cancelled: { color: 'red', text: 'Hủy' } };
    const st = statusMap[item.status] || { color: 'default', text: item.status };

    return (
        <Card size="small" className="mb-3 shadow-sm border-gray-200" bodyStyle={{ padding: '12px' }}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <UserOutlined className="text-blue-500" />
                    <span className="font-bold text-gray-800">{item.customerInfo.name}</span>
                </div>
                <Tag color={st.color}>{st.text}</Tag>
            </div>
            
            <div className="flex justify-between items-center text-sm mb-2 border-b pb-2 border-gray-50">
                <span className="text-gray-500"><PhoneOutlined/> {item.customerInfo.phone}</span>
                <span className="font-bold text-green-600 text-base">{item.totalPrice.toLocaleString()}đ</span>
            </div>

            <div className="flex flex-col gap-1 text-xs text-gray-600 mb-2">
                 <div className="flex gap-2">
                    <span className="font-bold w-8 text-green-700">Đón:</span>
                    <span>{dayjs(item.pickupPoint.time).format('HH:mm')} - {item.pickupPoint.name}</span>
                 </div>
                 <div className="flex gap-2">
                    <span className="font-bold w-8 text-orange-700">Trả:</span>
                    <span>{item.dropoffPoint.name}</span>
                 </div>
            </div>

            <div className="flex justify-between items-center pt-1">
                <div className="flex gap-1 flex-wrap">
                    {item.seatCodes.map(s => <Tag key={s} className="m-0 font-mono font-bold bg-blue-50 text-blue-700 border-blue-200">{s}</Tag>)}
                </div>
                {item.review && (
                    <Tag color="gold"><StarFilled/> {item.review.rating}</Tag>
                )}
            </div>
        </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Quản lý Đặt vé</h2>
      </div>

      <Card className="mb-4 shadow-sm border-0" bodyStyle={{ padding: '16px' }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <div className="text-xs font-bold text-gray-500 mb-1">NHÀ XE</div>
            <Select className="w-full" placeholder="Chọn nhà xe" options={companies.map(c => ({ label: c.name, value: c._id }))} value={selectedCompany} onChange={setSelectedCompany} />
          </Col>
          <Col xs={12} md={6}>
            <div className="text-xs font-bold text-gray-500 mb-1">NGÀY ĐI</div>
            <DatePicker className="w-full" value={selectedDate} onChange={(date) => date && setSelectedDate(date)} format="DD/MM/YYYY" allowClear={false} />
          </Col>
          <Col xs={24} md={12}>
            <div className="text-xs font-bold text-gray-500 mb-1">CHUYẾN XE</div>
            <Select
              className="w-full"
              placeholder={trips.length === 0 ? "Không có chuyến" : "Chọn chuyến..."}
              disabled={trips.length === 0}
              value={selectedTripId}
              onChange={setSelectedTripId}
              options={trips.map(t => ({ value: t._id, label: `${dayjs(t.departureTime).format('HH:mm')} - ${t.routeId.name} (${t.busId.plateNumber})` }))}
              dropdownMatchSelectWidth={false}
            />
          </Col>
        </Row>
      </Card>

      {selectedTripId ? (
        <div className="animate-fade-in">
          {/* Stats Row: 2 cột trên mobile (xs=12) */}
          <Row gutter={[8, 8]} className="mb-4">
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm bg-blue-50 text-center" size="small">
                <Statistic title="Đã đặt" value={tripStats.booked} suffix={`/ ${tripStats.total}`} valueStyle={{ color: '#2563eb', fontSize: '1.2rem' }} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm bg-green-50 text-center" size="small">
                <Statistic title="Doanh thu" value={tripStats.revenue} precision={0} valueStyle={{ color: '#16a34a', fontSize: '1.2rem' }} formatter={(val) => val.toLocaleString()} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card bordered={false} className="shadow-sm bg-yellow-50 text-center" size="small">
                <Statistic title="Đánh giá" value={tripStats.rating} precision={1} suffix={`(${tripStats.reviewCount})`} valueStyle={{ color: '#d4b106', fontSize: '1.2rem' }} prefix={<StarFilled />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
               <Card bordered={false} className="shadow-sm flex items-center justify-center h-full cursor-pointer hover:bg-gray-100 active:bg-gray-200" onClick={fetchTripDetails} size="small">
                  <div className="text-center text-gray-500 font-medium">
                    <SyncOutlined spin={loadingBookings} className="text-lg block mb-1" />
                    Làm mới
                  </div>
               </Card>
            </Col>
          </Row>
          
          <Card title={<div className="flex items-center gap-2"><span>Danh sách vé</span><Badge status="processing" /></div>} className="shadow-sm" bodyStyle={{ padding: screens.md ? '24px' : '12px' }}>
            {!screens.md ? (
                // MOBILE: List Card
                <List
                    dataSource={bookings}
                    renderItem={renderMobileBookingItem}
                    loading={loadingBookings}
                    locale={{ emptyText: 'Chưa có vé nào' }}
                />
            ) : (
                // DESKTOP: Table
                <Table
                    rowKey="_id"
                    columns={columns}
                    dataSource={bookings}
                    loading={loadingBookings}
                    pagination={{ pageSize: 10 }}
                />
            )}
          </Card>
        </div>
      ) : (
        <div className="h-48 flex flex-col items-center justify-center bg-white rounded-lg border border-dashed border-gray-300 text-gray-400 p-4 text-center">
           <Empty description="Chọn chuyến xe để xem dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}
    </div>
  );
}