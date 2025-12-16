'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, message, Space, Spin } from 'antd';
import { 
  UserOutlined, 
  ShopOutlined, 
  DollarOutlined, 
  CarOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined 
} from '@ant-design/icons';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Interface dữ liệu
interface DashboardStats {
  totalRevenue: number;
  totalUsers: number;
  totalCompanies: number;
  totalTrips: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data biểu đồ (Thực tế bạn sẽ gọi API)
  const chartData = [
    { name: 'T2', revenue: 4000 },
    { name: 'T3', revenue: 3000 },
    { name: 'T4', revenue: 2000 },
    { name: 'T5', revenue: 2780 },
    { name: 'T6', revenue: 1890 },
    { name: 'T7', revenue: 2390 },
    { name: 'CN', revenue: 3490 },
  ];

  // Fetch dữ liệu
  const fetchData = async () => {
    try {
      setLoading(true);
      // Gọi API thống kê (Sẽ tạo ở bước sau)
      const resStats = await fetch('/api/admin/dashboard');
      const dataStats = await resStats.json();

      if (dataStats.success) setStats(dataStats.data);
      
    } catch (error) {
      console.error(error);
      message.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  
  if (loading) return <div className="h-screen flex justify-center items-center"><Spin size="large" /></div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Quản Trị</h2>

      {/* 1. THỐNG KÊ TỔNG QUAN */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" className="shadow-sm hover:shadow-md transition">
            <Statistic
              title="Tổng Doanh Thu"
              value={stats?.totalRevenue || 0}
              precision={0}
              valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
              prefix={<DollarOutlined />}
              suffix="₫"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card  variant="borderless" className="shadow-sm hover:shadow-md transition">
            <Statistic
              title="Người dùng hệ thống"
              value={stats?.totalUsers || 0}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              prefix={<UserOutlined />}
            />
          </Card>   
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition">
            <Statistic
              title="Nhà xe đối tác"
              value={stats?.totalCompanies || 0}
              valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition">
            <Statistic
              title="Chuyến đi hoạt động"
              value={stats?.totalTrips || 0}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 2. BIỂU ĐỒ & DUYỆT NHÀ XE */}
      <Row gutter={[16, 16]}>
        {/* Biểu đồ doanh thu */}
        <Col xs={24} lg={14}>
          <Card title="Biểu đồ doanh thu (7 ngày gần nhất)" bordered={false} className="shadow-sm h-full">
            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2474E5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2474E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(Number(value)) + ' ₫'} />
                  <Area type="monotone" dataKey="revenue" stroke="#2474E5" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
    </Row>
    </div>
  );
}