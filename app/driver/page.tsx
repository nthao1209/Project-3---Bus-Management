'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Tag, Button, Spin, Empty, Badge } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, CarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface DriverTrip {
  _id: string;
  routeId: { name: string };
  busId: { plateNumber: string };
  departureTime: string;
  status: string;
  seatsStatus: any;
}

export default function DriverDashboard() {
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/driver/trips')
      .then(res => res.json())
      .then(data => {
        if (data.success) setTrips(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'running') return 'green';
    if (status === 'scheduled') return 'blue';
    return 'default';
  };

  const getStatusText = (status: string) => {
    if (status === 'running') return 'Đang chạy';
    if (status === 'scheduled') return 'Sắp chạy';
    return status;
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Xin chào, Tài xế! 🚍</h1>
        <p className="text-gray-500 text-sm">Lịch chạy của bạn hôm nay</p>
      </div>

      {trips.length === 0 ? (
        <Empty description="Không có chuyến nào sắp tới" />
      ) : (
        <div className="flex flex-col gap-4">
          {trips.map(trip => (
            <Card 
              key={trip._id}
              className="shadow-sm border-0 rounded-xl overflow-hidden active:scale-[0.98] transition-transform"
              bodyStyle={{ padding: '16px' }}
              onClick={() => router.push(`/driver/trip/${trip._id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <Tag color={getStatusColor(trip.status)} className="m-0 text-sm py-0.5 px-2 rounded-md">
                   {getStatusText(trip.status)}
                </Tag>
                <div className="font-mono text-gray-500 text-xs">
                   #{trip.busId.plateNumber}
                </div>
              </div>
              
              <h3 className="font-bold text-lg text-blue-700 mb-1">
                 {trip.routeId.name}
              </h3>

              <div className="flex items-center gap-2 text-gray-600 mb-4">
                 <ClockCircleOutlined />
                 <span className="font-semibold">
                   {dayjs(trip.departureTime).format('HH:mm - DD/MM/YYYY')}
                 </span>
              </div>

              <div className="flex justify-between items-center border-t pt-3">
                 <span className="text-gray-500 text-xs">Bấm để xem danh sách khách</span>
                 <Button type="primary" size="small" shape="round">Chi tiết</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}