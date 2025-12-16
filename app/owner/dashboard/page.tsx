'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin, message, Alert } from 'antd';
import { 
  DollarCircleOutlined, 
  ShoppingOutlined, 
  CarOutlined, 
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

export default function OwnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/owner/dashboard/stats');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          // Nếu chưa có công ty hoặc lỗi quyền
          message.warning('Chưa tải được dữ liệu thống kê');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex h-screen justify-center items-center"><Spin size="large" /></div>;

  // Cấu hình bảng booking gần đây
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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tổng quan hoạt động</h2>
        <p className="text-gray-500">Chào mừng trở lại! Đây là tình hình kinh doanh nhà xe của bạn.</p>
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
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tăng trưởng tuần"
              value={12.5}
              precision={1}
              valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
              prefix={<RiseOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {/* 2. BIỂU ĐỒ VÀ BẢNG */}
      <Row gutter={[16, 16]}>
        {/* Biểu đồ bên trái */}
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

        {/* Danh sách booking mới nhất bên phải */}
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