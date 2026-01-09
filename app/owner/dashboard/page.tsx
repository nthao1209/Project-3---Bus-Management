'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, message, Alert, Badge } from 'antd';
import { 
  DollarCircleOutlined, 
  ShoppingOutlined, 
  CarOutlined, 
  ClockCircleOutlined,
  BellOutlined
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { io, Socket } from 'socket.io-client';

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [newBookingCount, setNewBookingCount] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/owner/dashboard/stats');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        message.warning('Chưa tải được dữ liệu thống kê');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const socketInstance = io({
      path: '/socket.io',
    });

    socketInstance.on('connect', () => {
      console.log('Dashboard connected to Socket.IO, ID:', socketInstance.id);
      
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          console.log('User data:', data);
          if (data.user?.companyId) {
            const companyId = data.user.companyId;
            console.log('Joining company room:', companyId);
            socketInstance.emit('join_company_dashboard', companyId);
          } else {
            console.warn('No companyId found for owner');
          }
        })
        .catch(err => console.error('Error fetching user:', err));
    });

    socketInstance.on('disconnect', () => {
      console.log(' Dashboard disconnected from Socket.IO');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketInstance.on('joined_dashboard', (data: any) => {
      console.log('Successfully joined dashboard room:', data);
    });

    socketInstance.on('new_booking', (eventData: any) => {
      console.log(' New booking received:', eventData);
      
      message.success({
        content: `Có đơn hàng mới từ ${eventData.customerName}! (+${eventData.amount.toLocaleString()}đ)`,
        duration: 5
      });
      
      setNewBookingCount(prev => prev + 1);
      
      console.log('Refreshing stats due to new booking...');
      fetchStats();
    });

    // Listen for booking updates
    socketInstance.on('booking_updated', (eventData: any) => {
      console.log('Booking updated:', eventData);
      
      if (eventData.type === 'office_booking') {
        message.info(`Đơn hàng mới tại quầy: ${eventData.customerName}`);
      }
      
      // Refresh stats
      fetchStats();
    });

    setSocket(socketInstance);

    // Auto refresh every 30 seconds
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard stats...');
      fetchStats();
    }, 30000);

    return () => {
      socketInstance.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  if (loading) return <div className="flex h-screen justify-center items-center"><Spin size="large" /></div>;

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
             {new Date(trip?.departureTime).toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}
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

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tổng quan hoạt động</h2>
          <p className="text-gray-500">Chào mừng trở lại! Đây là tình hình kinh doanh nhà xe của bạn.</p>
        </div>
        {newBookingCount > 0 && (
          <Badge count={newBookingCount} offset={[-5, 5]}>
            <BellOutlined 
              style={{ fontSize: 28, color: '#1890ff' }} 
              onClick={() => {
                setNewBookingCount(0);
                message.info('Đã xem tất cả thông báo mới');
              }}
            />
          </Badge>
        )}
      </div>

      {!data && (
        <Alert
            message="Chưa có dữ liệu"
            description="Có vẻ bạn chưa tạo Nhà xe hoặc chưa có chuyến đi nào."
            type="info"
            showIcon
            className="mb-6"
        />
      )}

      {/* 1. CARDS THỐNG KÊ */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Doanh thu tạm tính"
              value={data?.totalRevenue || 0}
              precision={0}
              valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
              prefix={<DollarCircleOutlined />}
              suffix="₫"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
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
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng số chuyến"
              value={data?.totalTrips || 0}
              valueStyle={{ color: '#d97706', fontWeight: 'bold' }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Doanh thu 7 ngày gần nhất" bordered={false} className="shadow-sm h-full min-h-[400px]">
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
            bordered={false} 
            className="shadow-sm h-full"
            bodyStyle={{ padding: '0' }}
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
    </div>
  );
}
