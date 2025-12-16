'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Select, DatePicker, Tag, message, Space, Popconfirm, Avatar 
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, 
  UserOutlined, ClockCircleOutlined, CarOutlined, EnvironmentOutlined, SyncOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable';
import TripModal from '@/components/TripModal'; // Import Component Modal vừa tách
import dayjs from 'dayjs';

// --- Interfaces ---
interface Trip {
  id: string; 
  _id: string;
  routeId: { _id: string; name: string };
  busId: { _id: string; plateNumber: string; type: string };
  driverId?: { _id: string; name: string; phone: string };
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
}

interface SelectOption {
  label: string;
  value: string;
}

export default function OwnerTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State lọc và tạo lịch tự động
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // State dữ liệu phụ trợ
  const [optionsData, setOptionsData] = useState<{
    companies: SelectOption[];
    routes: SelectOption[];
    buses: SelectOption[];
    drivers: SelectOption[];
    templates: SelectOption[];
  }>({ companies: [], routes: [], buses: [], drivers: [], templates: [] });

  // 1. Fetch Danh sách Chuyến đi
  const fetchTrips = async () => {
    setLoading(true);
    try {
      let url = '/api/owner/trips';
      if (filterDate) {
        url += `?date=${filterDate.format('YYYY-MM-DD')}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTrips(data.data.map((item: any) => ({ ...item, id: item._id })));
      }
    } catch {
      message.error('Lỗi tải danh sách chuyến đi');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Dữ liệu phụ trợ (Routes, Buses, Drivers, Templates...)
  const fetchDependencies = async () => {
    try {
      const [resComp, resRoutes, resBuses, resDrivers, resTemplates] = await Promise.all([
        fetch('/api/owner/companies'),
        fetch('/api/owner/routes'),
        fetch('/api/owner/buses'),
        fetch('/api/owner/drivers'),
        fetch('/api/owner/trip-templates') 
      ]);

      const [dComp, dRoutes, dBuses, dDrivers, dTemplates] = await Promise.all([
        resComp.json(), resRoutes.json(), resBuses.json(), resDrivers.json(), resTemplates.json()
      ]);
      
      console.log("API Routes:", dRoutes);
      console.log("API Buses:", dBuses);

      setOptionsData({
        companies: dComp.success ? dComp.data.map((c: any) => ({ label: c.name, value: c._id })) : [],
        routes: dRoutes.success ? dRoutes.data.map((r: any) => ({ label: r.name, value: r._id })) : [],
        buses: dBuses.success ? dBuses.data.map((b: any) => ({ label: `${b.plateNumber} (${b.type})`, value: b._id })) : [],
        drivers: dDrivers.success ? dDrivers.data.map((d: any) => ({ label: `${d.name} - ${d.phone}`, value: d._id })) : [],
        templates: dTemplates.success ? dTemplates.data.map((t: any) => ({ label: t.name, value: t._id })) : [],
      });

    } catch (error) {
      console.error("Lỗi tải dữ liệu phụ trợ", error);
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchDependencies();
  }, [filterDate]);

  // 3. Xử lý Tạo/Sửa Chuyến đi (Gọi từ Modal)
  const handleModalSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const url = editingTrip ? `/api/owner/trips/${editingTrip._id}` : '/api/owner/trips';
      const method = editingTrip ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (res.ok) {
        message.success(editingTrip ? 'Cập nhật thành công' : 'Lên lịch thành công');
        setIsModalOpen(false);
        setEditingTrip(null);
        fetchTrips();
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch {
      message.error('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Xử lý Sinh Lịch Tự Động (Cron Trigger)
  const handleGenerateTrips = async () => {
    if (!selectedTemplateId) return message.warning('Vui lòng chọn mẫu lịch trình trước');
    
    const hide = message.loading('Đang sinh lịch tự động...', 0);
    try {
      const res = await fetch('/api/cron/generate-trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId })
      });
      const json = await res.json();
      
      if (res.ok) {
        message.success(json.message);
        fetchTrips();
      } else {
        message.error(json.message);
      }
    } catch {
      message.error('Lỗi hệ thống');
    } finally {
      hide();
    }
  };

  // 5. Xử lý Xóa
  const handleDelete = async (id: string) => {
    await fetch(`/api/owner/trips/${id}`, { method: 'DELETE' });
    message.success('Đã xóa chuyến đi');
    fetchTrips();
  };

  // --- UI Components ---
  const openModal = (record?: Trip) => {
    setEditingTrip(record || null);
    setIsModalOpen(true);
  };

  const columns: ColumnsType<Trip> = [
    {
      title: 'Tuyến đường & Giờ chạy',
      key: 'route',
      width: 250,
      render: (_, r) => (
        <div className="flex flex-col">
          <span className="font-bold text-blue-700 flex items-center gap-1">
            <EnvironmentOutlined /> {r.routeId?.name || 'Chưa đặt tên'}
          </span>
          <div className="text-gray-500 text-sm mt-1">
            <ClockCircleOutlined /> {dayjs(r.departureTime).format('HH:mm')} - {dayjs(r.arrivalTime).format('HH:mm')}
          </div>
          <span className="text-xs text-gray-400">{dayjs(r.departureTime).format('DD/MM/YYYY')}</span>
        </div>
      )
    },
    {
      title: 'Xe & Biển số',
      key: 'bus',
      width: 200,
      render: (_, r) => (
        <div>
          <div className="font-semibold flex items-center gap-2"><CarOutlined /> {r.busId?.plateNumber}</div>
          <Tag color="cyan" className="mt-1">{r.busId?.type}</Tag>
        </div>
      )
    },
    {
      title: 'Tài xế',
      key: 'driver',
      width: 200,
      render: (_, r) => r.driverId ? (
        <Space>
          <Avatar icon={<UserOutlined />} className="bg-orange-400" />
          <div className="flex flex-col">
             <span className="font-medium">{r.driverId.name}</span>
             <span className="text-xs text-gray-500">{r.driverId.phone}</span>
          </div>
        </Space>
      ) : <Tag>Chưa phân công</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (st) => {
        const colorMap: any = { scheduled: 'blue', running: 'green', completed: 'gray', cancelled: 'red' };
        const textMap: any = { scheduled: 'Đã lên lịch', running: 'Đang chạy', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
        return <Tag color={colorMap[st]}>{textMap[st]}</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" type="text" onClick={() => openModal(r)} className="text-blue-600" />
          <Popconfirm title="Xóa chuyến này?" onConfirm={() => handleDelete(r._id)}>
            <Button icon={<DeleteOutlined />} size="small" type="text" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Thanh công cụ phụ (Filter & Auto Generate)
  const ExtraTools = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {/* Chọn Template để sinh lịch */}
      <Select 
        placeholder="Chọn mẫu lịch trình..." 
        style={{ width: 180 }} 
        options={optionsData.templates}
        onChange={(val) => setSelectedTemplateId(val)}
        allowClear
      />
      <Button 
        type="primary" 
        icon={<SyncOutlined />} 
        onClick={handleGenerateTrips}
        disabled={!selectedTemplateId}
        className="bg-purple-600 hover:bg-purple-500"
      >
        Cập nhật lịch (30 ngày)
      </Button>
      
      {/* Bộ lọc ngày */}
      <DatePicker 
        value={filterDate} 
        onChange={(d) => setFilterDate(d)} 
        format="DD/MM/YYYY" 
        allowClear={false}
        className="ml-2 border-blue-500"
      />
    </div>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <DataTable
        title="Quản lý Lịch Chạy"
        columns={columns}
        dataSource={trips}
        loading={loading}
        onReload={fetchTrips}
        onAdd={() => openModal()}
        searchPlaceholder="Tìm tên tuyến, biển số..."
        searchFields={['routeId.name', 'busId.plateNumber']}
        extraButtons={ExtraTools}
      />

      {/* Component Modal Đã Tách */}
      <TripModal
        open={isModalOpen}
        loading={submitting}
        initialValues={editingTrip}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        data={optionsData} // Truyền toàn bộ options vào
      />
    </div>
  );
}