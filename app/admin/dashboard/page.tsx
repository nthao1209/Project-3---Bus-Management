'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, message, Empty } from 'antd';
import { 
  UserOutlined, ShopOutlined, DollarOutlined, CarOutlined 
} from '@ant-design/icons';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import dayjs from 'dayjs'; 

interface DashboardStats {
  totalRevenue: number;
  totalUsers: number;
  totalCompanies: number;
  totalTrips: number;
  revenueChart: { 
    date: string; 
    revenue: number; 
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const dummyChartData = Array.from({ length: 7 }, (_, i) => ({
    date: dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD'),
    revenue: 0
  }));

  const fetchData = async () => {
    try {
      setLoading(true);
      const resStats = await fetch('/api/admin/dashboard');
      const dataStats = await resStats.json();

      if (dataStats.success) {
        setStats(dataStats.data);
      }
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

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  const formatXAxis = (dateStr: string) => {
    return dayjs(dateStr).format('DD/MM');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
          <p className="text-sm text-gray-500 mb-1">{dayjs(label).format('DD/MM/YYYY')}</p>
          <p className="text-base font-bold text-blue-600">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="h-screen flex justify-center items-center"><Spin size="large" /></div>;

  const chartData = (stats?.revenueChart && stats.revenueChart.length > 0) 
    ? stats.revenueChart 
    : dummyChartData;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Quản Trị</h2>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm hover:shadow-md transition">
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
          <Card bordered={false} className="shadow-sm hover:shadow-md transition">
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

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card 
            title="Biểu đồ doanh thu (7 ngày gần nhất)" 
            bordered={false} 
            className="shadow-sm"
            bodyStyle={{ height: 400 }} 
          >
            {chartData.every(d => d.revenue === 0) && stats?.revenueChart ? (
               <div className="h-full flex flex-col justify-center items-center">
                  <Empty description="Chưa có dữ liệu doanh thu tuần này" />
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2474E5" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2474E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxis}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666', fontSize: 12 }}
                    dy={10}
                  />
                  
                  <YAxis 
                    tickFormatter={formatYAxis}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666', fontSize: 12 }}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#2474E5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}