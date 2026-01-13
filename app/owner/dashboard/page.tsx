'use client';

import React, { useEffect, useState } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Spin, message, 
  Badge, Button, Dropdown, DatePicker, Radio 
} from 'antd';
import type { MenuProps } from 'antd';
import { 
  DollarCircleOutlined, ShoppingOutlined, CarOutlined, 
  ClockCircleOutlined, BellOutlined, DownOutlined, ShopOutlined,
  SyncOutlined // Đã thêm icon này
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { io, Socket } from 'socket.io-client';
import dayjs from 'dayjs';

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<any[]>([]);
  
  // State cho bộ lọc
  const [filterType, setFilterType] = useState<'day' | 'month' | 'year'>('month');
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs>(dayjs());

  const fetchStats = async (companyId?: string) => {
    try {
      setLoading(true);
      let url = '/api/owner/dashboard/stats';
      const params = new URLSearchParams();

      if (companyId) params.append('companyId', companyId);
      else if (selectedCompany) params.append('companyId', selectedCompany);

      // Thêm tham số lọc
      params.append('type', filterType);
      params.append('date', filterDate.format('YYYY-MM-DD'));

      const res = await fetch(`${url}?${params.toString()}`);
      const json = await res.json();
      
      if (json.success) {
        if (json.data.needsSelection) {
          setCompanies(json.data.companies || []);
          setData(null);
        } else {
          setData(json.data);
          if (json.data.company) {
            setSelectedCompany(json.data.company._id);
          }
        }
      } else {
        message.warning(json.message || 'Chưa tải được dữ liệu thống kê');
      }
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompany(companyId);
    // Khi đổi công ty, gọi fetch ngay lập tức với ID mới
    // (useEffect sẽ lo phần filterDate/Type)
    if (socket && socket.connected) {
      socket.emit('join_company_dashboard', companyId);
      console.log('Switched to company room:', companyId);
    }
  };

  // Gọi API khi thay đổi bộ lọc hoặc công ty
  useEffect(() => {
    fetchStats();
  }, [filterType, filterDate, selectedCompany]);

  // Setup Socket & Auto Refresh
  useEffect(() => {
    const socketInstance = io({
      path: '/socket.io',
    });

    socketInstance.on('connect', () => {
      console.log('Dashboard connected to Socket.IO, ID:', socketInstance.id);
      if (selectedCompany) {
         socketInstance.emit('join_company_dashboard', selectedCompany);
      }
    });

    socketInstance.on('new_booking', (eventData: any) => {
      console.log('New booking received:', eventData);
      
      if (!selectedCompany || eventData.companyId === selectedCompany) {
        message.success({
          content: `Có đơn hàng mới từ ${eventData.customerName}! (+${eventData.amount.toLocaleString()}đ)`,
          duration: 5
        });
        
        setNewBookingCount(prev => prev + 1);
        fetchStats(selectedCompany);
      }
    });

    socketInstance.on('booking_updated', (eventData: any) => {
      if (eventData.type === 'office_booking' && 
          (!selectedCompany || eventData.companyId === selectedCompany)) {
        message.info(`Đơn hàng mới tại quầy: ${eventData.customerName}`);
        fetchStats(selectedCompany);
      }
    });

    setSocket(socketInstance);

    const intervalId = setInterval(() => {
      fetchStats(selectedCompany);
    }, 30000);

    return () => {
      socketInstance.disconnect();
      clearInterval(intervalId);
    };
  }, []); // Run once on mount (socket init)

  if (loading && !data && companies.length === 0) {
    return <div className="flex h-screen justify-center items-center"><Spin size="large" /></div>;
  }

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
            {new Date(trip?.departureTime).toLocaleString('vi-VN', { 
              hour: '2-digit', 
              minute:'2-digit', 
              day:'2-digit', 
              month:'2-digit' 
            })}
          </div>
        </div>
      )
    },
    {
      title: 'Số ghế',
      dataIndex: 'seatCodes',
      key: 'seats',
      render: (seats: string[]) => <Tag>{seats.join(', ')}</Tag>
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (price: number) => <span className="font-bold text-green-600">{price.toLocaleString()}đ</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        let text = status;
        if (status === 'confirmed') { color = 'green'; text = 'Đã thanh toán'; }
        if (status === 'pending_payment') { color = 'orange'; text = 'Chờ thanh toán'; }
        if (status === 'cancelled') { color = 'red'; text = 'Đã hủy'; }
        return <Tag color={color}>{text}</Tag>;
      }
    }
  ];

  const companyMenuItems: MenuProps['items'] = companies.map(company => ({
    key: company._id,
    label: (
      <div className="flex items-center gap-2">
        <ShopOutlined />
        <span>{company.name}</span>
        <Tag
          color={company.status === 'active' ? 'green' : 'orange'}
          className="ml-2"
        >
          {company.status === 'active' ? 'Hoạt động' : 'Chờ duyệt'}
        </Tag>
      </div>
    ),
  }));

  const getChartTitle = () => {
    if (filterType === 'day') return `Doanh thu ngày ${filterDate.format('DD/MM/YYYY')}`;
    if (filterType === 'month') return `Doanh thu tháng ${filterDate.format('MM/YYYY')}`;
    return `Doanh thu năm ${filterDate.format('YYYY')}`;
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Phần Tiêu đề & Chọn công ty */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-800">Tổng quan hoạt động</h2>
            {data?.company ? (
              <Dropdown
                menu={{
                  items: companyMenuItems,
                  onClick: ({ key }) => handleCompanyChange(key),
                }}
                trigger={['click']}
              >
                <Button type="text" className="flex items-center gap-1">
                  <ShopOutlined />
                  <span className="font-medium">{data.company.name}</span>
                  <Tag
                    color={data.company.status === 'active' ? 'green' : 'orange'}
                    className="ml-2"
                  >
                    {data.company.status === 'active' ? 'Hoạt động' : 'Chờ duyệt'}
                  </Tag>
                  <DownOutlined className="text-xs" />
                </Button>
              </Dropdown>
            ) : companies.length > 0 ? (
              <Dropdown
                menu={{
                  items: companyMenuItems,
                  onClick: ({ key }) => handleCompanyChange(key),
                }}
                trigger={['click']}
              >
                <Button type="primary" className="flex items-center gap-1">
                  <ShopOutlined />
                  <span>Chọn công ty</span>
                  <DownOutlined className="text-xs" />
                </Button>
              </Dropdown>
            ) : null}
          </div>
          <p className="text-gray-500">
            {data?.company 
              ? `Chào mừng trở lại! Đây là tình hình kinh doanh của ${data.company.name}.`
              : 'Chào mừng trở lại! Chọn công ty để xem thống kê.'
            }
          </p>
        </div>

        {/* Phần Bộ lọc & Thông báo */}
        <div className="flex items-center gap-4">
           {/* Bộ lọc thời gian */}
           <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm">
             <Radio.Group 
               value={filterType} 
               onChange={(e) => setFilterType(e.target.value)} 
               buttonStyle="solid"
             >
               <Radio.Button value="day">Ngày</Radio.Button>
               <Radio.Button value="month">Tháng</Radio.Button>
               <Radio.Button value="year">Năm</Radio.Button>
             </Radio.Group>
             
             <DatePicker 
               value={filterDate} 
               onChange={(date) => date && setFilterDate(date)} 
               picker={filterType === 'day' ? 'date' : filterType} 
               allowClear={false}
               format={filterType === 'day' ? 'DD/MM/YYYY' : (filterType === 'month' ? 'MM/YYYY' : 'YYYY')}
               className="w-36"
             />
             <Button icon={<SyncOutlined />} onClick={() => fetchStats()} />
           </div>

           {/* Chuông thông báo */}
           {newBookingCount > 0 && (
              <Badge count={newBookingCount} offset={[-5, 5]}>
                <BellOutlined 
                  style={{ fontSize: 24, color: '#1890ff', cursor: 'pointer' }} 
                  onClick={() => {
                    setNewBookingCount(0);
                    message.info('Đã xem tất cả thông báo mới');
                  }}
                />
              </Badge>
           )}
        </div>
      </div>

      {/* Case 1: Chưa có công ty nào */}
      {!data && companies.length === 0 && !loading && (
        <Card className="text-center py-12">
          <ShopOutlined style={{ fontSize: 48, color: '#999', marginBottom: 16 }} />
          <h3 className="text-lg font-medium mb-2">Chưa có công ty nào</h3>
          <p className="text-gray-500 mb-4">Bạn cần tạo công ty trước khi xem thống kê</p>
          <Button type="primary" href="/owner/companies/create">
            Tạo công ty mới
          </Button>
        </Card>
      )}

      {/* Case 2: Có công ty nhưng chưa chọn (hoặc đang load list) */}
      {!data && companies.length > 0 && (
        <Card className="text-center py-12">
          <ShopOutlined style={{ fontSize: 48, color: '#999', marginBottom: 16 }} />
          <h3 className="text-lg font-medium mb-2">Chọn công ty để xem thống kê</h3>
          <p className="text-gray-500 mb-4">Bạn có {companies.length} công ty. Vui lòng chọn một công ty từ dropdown ở trên.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {companies.map(company => (
              <Card
                key={company._id}
                hoverable
                className="w-64 cursor-pointer text-left"
                onClick={() => handleCompanyChange(company._id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium truncate">{company.name}</h4>
                  <Tag color={company.status === 'active' ? 'green' : 'orange'}>
                    {company.status === 'active' ? 'Active' : 'Pending'}
                  </Tag>
                </div>
                <p className="text-sm text-gray-500">{company.hotline}</p>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Case 3: Đã có dữ liệu (Hiển thị Dashboard) */}
      {data && !data.needsSelection && (
        <>
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-sm">
                <Statistic
                  title={filterType === 'day' ? "Doanh thu ngày" : (filterType === 'month' ? "Doanh thu tháng" : "Doanh thu năm")}
                  value={data?.totalRevenue || 0}
                  precision={0}
                  valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
                  prefix={<DollarCircleOutlined />}
                  suffix="₫"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-sm">
                <Statistic
                  title="Vé đã bán"
                  value={data?.totalTickets || 0}
                  valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
                  prefix={<ShoppingOutlined />}
                  suffix="vé"
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-sm">
                <Statistic
                  title="Tổng số chuyến"
                  value={data?.totalTrips || 0}
                  valueStyle={{ color: '#d97706', fontWeight: 'bold' }}
                  prefix={<CarOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="shadow-sm">
                <div className="text-gray-500 text-sm mb-1">Trạng thái công ty</div>
                <div className="flex items-center gap-2">
                  <Tag color={data.company?.status === 'active' ? 'green' : 'orange'} className="text-base">
                    {data.company?.status === 'active' ? 'Đang hoạt động' : 'Chờ duyệt'}
                  </Tag>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Hotline: {data.company?.hotline}
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card 
                title={getChartTitle()} 
                className="shadow-sm h-full min-h-[400px]"
                extra={<small className="text-gray-500">Công ty: {data.company?.name}</small>}
              >
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => value.toLocaleString() + ' đ'} />
                    <Legend />
                    <Bar name="Doanh thu" dataKey="value" fill="#2474E5" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card 
                title={<div className="flex items-center gap-2"><ClockCircleOutlined /> Đơn hàng mới nhất</div>} 
                className="shadow-sm h-full"
                styles={{ body: { padding: '0' } }}
                extra={<small className="text-gray-500">10 đơn gần nhất</small>}
              >
                <Table
                  columns={columns}
                  dataSource={data?.recentBookings || []}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                  className="w-full"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}