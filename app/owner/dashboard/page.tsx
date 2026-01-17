'use client';

import React, { useEffect, useState } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Spin, message, 
  Badge, Button, Dropdown, DatePicker, Radio, notification, List, Grid 
} from 'antd';
import type { MenuProps } from 'antd';
import { 
  DollarCircleOutlined, ShoppingOutlined, CarOutlined, 
  ClockCircleOutlined, BellOutlined, DownOutlined, ShopOutlined,
  SyncOutlined, StarFilled, UserOutlined
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { io, Socket } from 'socket.io-client';
import dayjs from 'dayjs';

const { useBreakpoint } = Grid;

export default function OwnerDashboard() {
  const screens = useBreakpoint(); // Hook kiểm tra kích thước màn hình
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [filterType, setFilterType] = useState<'day' | 'month' | 'year'>('month');
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs>(dayjs());

  // ... (GIỮ NGUYÊN PHẦN LOGIC FETCH API, SOCKET, USEEFFECT NHƯ CŨ) ...
  // Để tiết kiệm không gian, tôi chỉ paste lại phần Render UI đã sửa đổi
  // Hãy đảm bảo bạn giữ lại toàn bộ logic useEffect, fetchStats, handleCompanyChange cũ nhé.

  // --- MOCK LOGIC (Bạn giữ nguyên logic cũ của bạn ở đây) ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (json?.user) setCurrentUser(json.user);
      } catch (error) { console.error(error); }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const socketOrigin = process.env.SOCKET_ORIGIN ;
    const socketInstance = io(socketOrigin, { path: '/socket.io', transports: ['websocket'] });
    socketInstance.on('connect', () => socketInstance.emit('join_user_room', currentUser._id));
    socketInstance.on('receive_notification', (notif: any) => {
      notification.warning({ title: notif.title || 'Thông báo', message: notif.message, placement: 'topRight' });
    });
    return () => { socketInstance.disconnect(); };
  }, [currentUser]);

  const fetchStats = async (companyId?: string) => {
    try {
      setLoading(true);
      let url = '/api/owner/dashboard/stats';
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      else if (selectedCompany) params.append('companyId', selectedCompany);
      params.append('type', filterType);
      params.append('date', filterDate.format('YYYY-MM-DD'));

      const res = await fetch(`${url}?${params.toString()}`);
      const json = await res.json();
      
      if (json.success) {
        if (json.data.needsSelection) {
          setCompanies(json.data.companies || []);
          if (!selectedCompany) setData(null);
        } else {
          setData(json.data);
          if (json.data.company && !selectedCompany) setSelectedCompany(json.data.company._id);
        }
      } 
    } catch (error) { message.error('Lỗi khi tải dữ liệu'); } finally { setLoading(false); }
  };

  const handleCompanyChange = (companyId: string) => setSelectedCompany(companyId);

  useEffect(() => { fetchStats(); }, [filterType, filterDate, selectedCompany]);

  useEffect(() => {
    const socketOrigin = process.env.SOCKET_ORIGIN ;
    const socketInstance = io(socketOrigin, { path: '/socket.io', transports: ['websocket'] });
    socketInstance.on('connect', () => { if (selectedCompany) socketInstance.emit('join_company_dashboard', selectedCompany); });
    socketInstance.on('new_booking', (eventData: any) => {
      if (!selectedCompany || eventData.companyId === selectedCompany) {
        message.success(`Có đơn mới: +${eventData.amount.toLocaleString()}đ`);
        setNewBookingCount(prev => prev + 1);
        fetchStats(selectedCompany);
      }
    });
    setSocket(socketInstance);
    return () => { socketInstance.disconnect(); };
  }, [selectedCompany]);

  // --- END LOGIC ---

  const columns = [
    {
      title: 'Khách hàng',
      dataIndex: 'customerInfo',
      key: 'customerInfo',
      render: (info: any) => (
        <div>
          <div className="font-medium">{info?.name}</div>
          <div className="text-xs text-gray-500">{info?.phone}</div>
        </div>
      ),
    },
    {
      title: 'Chuyến xe',
      dataIndex: 'tripId',
      key: 'trip',
      render: (trip: any) => (
        <div>
          <div className="text-blue-600 font-medium">{trip?.routeId?.name || 'Chuyến đi'}</div>
          <div className="text-xs text-gray-500">
            {new Date(trip?.departureTime).toLocaleString('vi-VN', { month:'2-digit', day:'2-digit', hour: '2-digit', minute:'2-digit' })}
          </div>
        </div>
      )
    },
    { title: 'Ghế', dataIndex: 'seatCodes', key: 'seats', render: (seats: string[]) => <Tag>{seats.join(', ')}</Tag> },
    { title: 'Tổng', dataIndex: 'totalPrice', key: 'totalPrice', render: (price: number) => <span className="font-bold text-green-600">{price.toLocaleString()}đ</span> },
    {
        title: 'TT',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          let color = 'default';
          if (status === 'confirmed') color = 'green';
          if (status === 'pending_payment') color = 'orange';
          if (status === 'boarded') color = 'blue';
          if (status === 'cancelled') color = 'red';
          return <Tag color={color}>{status === 'confirmed' ? 'Đã TT' : status}</Tag>;
        }
      }
  ];

  const companyMenuItems: MenuProps['items'] = companies.map(company => ({
    key: company._id,
    label: (
      <div className="flex items-center gap-2">
        <ShopOutlined /> <span>{company.name}</span>
      </div>
    ),
  }));

  // --- RENDER MOBILE ITEM CHO DANH SÁCH ĐƠN HÀNG ---
  const renderMobileBookingItem = (item: any) => (
    <div className="border-b border-gray-100 py-3 last:border-0">
        <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
                <UserOutlined className="text-gray-400"/>
                <span className="font-semibold text-gray-700">{item.customerInfo?.name}</span>
            </div>
            <span className="font-bold text-green-600">{item.totalPrice?.toLocaleString()}đ</span>
        </div>
        <div className="text-xs text-gray-500 mb-2 pl-6">
            {item.tripId?.routeId?.name} • {dayjs(item.tripId?.departureTime).format('HH:mm DD/MM')}
        </div>
        <div className="flex justify-between items-center pl-6">
             <div className="flex gap-1">
                {item.seatCodes?.map((s:string) => <Tag key={s} className="m-0 text-[10px]">{s}</Tag>)}
             </div>
             <div>
                {item.status === 'confirmed' && <Tag color="green">Đã TT</Tag>}
                {item.status === 'pending_payment' && <Tag color="orange">Chờ TT</Tag>}
                {item.status === 'cancelled' && <Tag color="red">Hủy</Tag>}
             </div>
        </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen relative">
      {loading && <div className="fixed inset-0 bg-black/10 z-50 flex items-center justify-center"><Spin size="large" /></div>}

      <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Header Mobile: Title + Company Select */}
        <div className="w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Tổng quan</h2>
            {companies.length > 0 && (
                <Dropdown menu={{ items: companyMenuItems, onClick: ({ key }) => handleCompanyChange(key) }} trigger={['click']}>
                    <Button type={data?.company ? "text" : "primary"} className="flex items-center gap-1 font-medium text-blue-600">
                    <ShopOutlined /> {data?.company ? data.company.name : "Chọn công ty"} <DownOutlined className="text-xs" />
                    </Button>
                </Dropdown>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate">Chào mừng trở lại! Theo dõi tình hình kinh doanh.</p>
        </div>

        {/* Header Mobile: Filter Controls */}
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
             <Radio.Group value={filterType} onChange={(e) => setFilterType(e.target.value)} buttonStyle="solid" size="small">
               <Radio.Button value="day">Ngày</Radio.Button>
               <Radio.Button value="month">Tháng</Radio.Button>
               <Radio.Button value="year">Năm</Radio.Button>
             </Radio.Group>
             
             <DatePicker 
               value={filterDate} 
               onChange={(date) => date && setFilterDate(date)} 
               picker={filterType === 'day' ? 'date' : filterType} 
               allowClear={false}
               format={filterType === 'day' ? 'DD/MM' : (filterType === 'month' ? 'MM/YYYY' : 'YYYY')}
               className="w-28 md:w-36"
               size="small"
             />
             <div className="flex items-center gap-3 ml-1 border-l pl-3">
                 <Button icon={<SyncOutlined />} onClick={() => fetchStats()} size="small" shape="circle" />
                 <Badge count={newBookingCount} size="small">
                    <BellOutlined style={{ fontSize: 18, color: '#1890ff' }} onClick={() => { setNewBookingCount(0); }} />
                 </Badge>
             </div>
        </div>
      </div>

      {/* Hiển thị Dashboard */}
      {data && !data.needsSelection && (
        <>
          <Row gutter={[12, 12]} className="mb-4 md:mb-6">
            <Col xs={12} sm={12} lg={6}>
              <Card className="shadow-sm" size="small">
                <Statistic title="Doanh thu" value={data?.totalRevenue || 0} precision={0} valueStyle={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.2rem' }} prefix={<DollarCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card className="shadow-sm" size="small">
                <Statistic title="Vé bán" value={data?.totalTickets || 0} valueStyle={{ color: '#2563eb', fontWeight: 'bold', fontSize: '1.2rem' }} prefix={<ShoppingOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card className="shadow-sm" size="small">
                <Statistic title="Chuyến" value={data?.totalTrips || 0} valueStyle={{ color: '#d97706', fontWeight: 'bold', fontSize: '1.2rem' }} prefix={<CarOutlined />} />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card className="shadow-sm" size="small">
                <Statistic title="Đánh giá" value={data?.periodRating || 0} precision={1} valueStyle={{ color: '#faad14', fontWeight: 'bold', fontSize: '1.2rem' }} prefix={<StarFilled />} suffix={<span className="text-xs text-gray-400">/5</span>} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            {/* Chart: Ẩn trên mobile rất nhỏ nếu cần, hoặc giữ nguyên responsive */}
            <Col xs={24} lg={14}>
              <Card title="Biểu đồ doanh thu" className="shadow-sm h-full" bodyStyle={{ padding: '10px 0 10px 0' }}>
                <div className="h-[250px] md:h-[320px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.chartData || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{fontSize: 10}} />
                      <YAxis tickFormatter={(val) => val >= 1000000 ? `${val/1000000}M` : `${val/1000}k`} width={40} tick={{fontSize: 10}} />
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      <Bar name="Doanh thu" dataKey="value" fill="#2474E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            {/* Danh sách đơn hàng mới */}
            <Col xs={24} lg={10}>
              <Card 
                title={<div className="flex items-center gap-2"><ClockCircleOutlined /> Đơn mới nhất</div>} 
                className="shadow-sm h-full"
                bodyStyle={{ padding: '0 16px' }} // Padding nhỏ cho list
              >
                {!screens.md ? (
                    // MOBILE VIEW: Dùng List thẻ bài
                    <List
                        dataSource={data?.recentBookings || []}
                        renderItem={renderMobileBookingItem}
                        locale={{ emptyText: 'Chưa có đơn hàng' }}
                    />
                ) : (
                    // DESKTOP VIEW: Dùng Table
                    <Table
                        columns={columns}
                        dataSource={data?.recentBookings || []}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        scroll={{ x: 400 }}
                    />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}