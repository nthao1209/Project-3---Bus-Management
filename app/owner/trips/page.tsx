'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Select, DatePicker, Tag, message, Space, Popconfirm, Avatar, Tooltip 
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, 
  UserOutlined, ClockCircleOutlined, CarOutlined, EnvironmentOutlined, SyncOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable'; // Giả sử bạn đã có component này
import TripModal from '@/components/TripModal'; // Component Modal chúng ta vừa sửa
import dayjs from 'dayjs';

interface Trip {
  _id: string;
  routeId: { _id: string; name: string };
  busId: { _id: string; plateNumber: string; type: string };
  driverId?: { _id: string; name: string; phone: string };
  departureTime: string;
  arrivalTime: string;
  basePrice: number;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
  pickupPoints: any[];
  dropoffPoints: any[];
}

export default function OwnerTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // State dữ liệu phụ trợ (Options cho Select)
  const [modalData, setModalData] = useState<{
    companies: any[];
    routes: any[];
    fullRoutes: any[]; // QUAN TRỌNG: Để lấy defaultPickupPoints
    buses: any[];
    drivers: any[];
    stations: any[]; // QUAN TRỌNG: Chứa address để auto-fill
  }>({ 
    companies: [], routes: [], fullRoutes: [], buses: [], drivers: [], stations: [] 
  });

  // 1. Fetch Danh sách Chuyến đi
  const fetchTrips = async () => {
    setLoading(true);
    try {
      let url = '/api/owner/trips'; // API GET danh sách
      if (filterDate) {
        url += `?date=${filterDate.format('YYYY-MM-DD')}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTrips(data.data);
      }
    } catch (err) {
      message.error('Lỗi tải danh sách chuyến đi');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Dữ liệu phụ trợ cho Modal
  const fetchDependencies = async () => {
    try {
      // Gọi song song các API để tiết kiệm thời gian
      const [resComp, resRoutes, resBuses, resDrivers, resStations] = await Promise.all([
        fetch('/api/owner/companies'), // Lấy danh sách nhà xe của owner
        fetch('/api/owner/routes'),    // Lấy danh sách tuyến
        fetch('/api/owner/buses'),     // Lấy danh sách xe
        fetch('/api/owner/drivers'),   // Lấy danh sách tài xế
        fetch('/api/owner/stations')   // Lấy danh sách bến bãi
      ]);

      const [dComp, dRoutes, dBuses, dDrivers, dStations] = await Promise.all([
        resComp.json(), resRoutes.json(), resBuses.json(), resDrivers.json(), resStations.json()
      ]);
      
      setModalData({
        // Format dữ liệu cho Select (label, value)
        companies: dComp.data?.map((c: any) => ({ label: c.name, value: c._id })) || [],
        
        routes: dRoutes.data?.map((r: any) => ({ label: r.name, value: r._id })) || [],
        fullRoutes: dRoutes.data || [], // Lưu raw data để TripBaseForm dùng logic default points
        
        buses: dBuses.data?.map((b: any) => ({ label: `${b.plateNumber} (${b.type})`, value: b._id })) || [],
        
        drivers: dDrivers.data?.map((d: any) => ({ label: `${d.name} - ${d.phone}`, value: d._id })) || [],
        
        // QUAN TRỌNG: Map thêm trường address vào option stations
        stations: dStations.data?.map((s: any) => ({ 
          label: s.name, 
          value: s._id, 
          address: s.address // Cần trường này để auto-fill địa chỉ
        })) || [],
      });

    } catch (error) {
      console.error("Lỗi tải dữ liệu phụ trợ", error);
      message.error("Không tải được dữ liệu danh mục");
    }
  };

  useEffect(() => {
    fetchTrips();
    fetchDependencies();
  }, [filterDate]);

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
        message.success(editingTrip ? 'Cập nhật thành công' : 'Tạo chuyến thành công');
        setIsModalOpen(false);
        setEditingTrip(null);
        fetchTrips(); // Reload bảng
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch {
      message.error('Lỗi kết nối server');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Sinh Lịch Tự Động (Generate from Templates)
  const handleGenerateTrips = async () => {
    const hide = message.loading('Đang sinh lịch từ mẫu...', 0);
    try {
      const res = await fetch('/api/owner/trips/generate', {
        method: 'POST',
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

  // 5. Xóa chuyến đi
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/trips/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('Đã xóa chuyến đi');
        fetchTrips();
      } else {
        message.error('Không thể xóa');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const openModal = async (record?: Trip) => {
    if(record) {
      setIsFetchingDetail(true);
      try{
        const res= await fetch(`/api/owner/trips/${record._id}`);
        const data = await res.json();
        if(data.success){
          setEditingTrip(data.data);
          setIsModalOpen(true);
        } else {
          message.error('Không tải được chi tiết chuyến đi');
        }
      } catch(error){
        console.error(error);
        message.error('Lỗi kết nối server');
      } finally {
      setIsFetchingDetail(false);
      }
    } else {
      setEditingTrip(record || null);
      setIsModalOpen(true);
    }
  };

  const columns: ColumnsType<Trip> = [
    {
      title: 'Tuyến & Thời gian',
      key: 'route',
      width: 250,
      render: (_, r) => (
        <div className="flex flex-col">
          <span className="font-bold text-blue-700 flex items-center gap-1">
            <EnvironmentOutlined /> {r.routeId?.name || '---'}
          </span>
          <div className="text-gray-600 text-sm mt-1 font-medium">
            <ClockCircleOutlined /> {dayjs(r.departureTime).format('HH:mm')} - {dayjs(r.arrivalTime).format('HH:mm')}
          </div>
          <span className="text-xs text-gray-400">{dayjs(r.departureTime).format('DD/MM/YYYY')}</span>
        </div>
      )
    },
    {
      title: 'Xe',
      key: 'bus',
      width: 180,
      render: (_, r) => (
        <div>
          <div className="font-semibold flex items-center gap-2"><CarOutlined /> {r.busId?.plateNumber}</div>
          <Tag color="cyan" className="mt-1 text-xs">{r.busId?.type}</Tag>
        </div>
      )
    },
    {
      title: 'Tài xế',
      key: 'driver',
      width: 200,
      render: (_, r) => r.driverId ? (
        <Space>
          <Avatar icon={<UserOutlined />} className="bg-orange-400" size="small" />
          <div className="flex flex-col">
             <span className="text-sm font-medium">{r.driverId.name}</span>
             <span className="text-xs text-gray-500">{r.driverId.phone}</span>
          </div>
        </Space>
      ) : <Tag>Chưa phân công</Tag>
    },
    {
      title: 'Giá vé',
      dataIndex: 'basePrice',
      key: 'price',
      width: 120,
      render: (val) => <span className="font-medium text-green-600">{val?.toLocaleString()} đ</span>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (st) => {
        const colorMap: any = { scheduled: 'blue', running: 'green', completed: 'gray', cancelled: 'red' };
        const textMap: any = { scheduled: 'Sắp chạy', running: 'Đang chạy', completed: 'Hoàn thành', cancelled: 'Hủy' };
        return <Tag color={colorMap[st]}>{textMap[st]}</Tag>;
      }
    },
    {
      title: '',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title="Sửa">
            <Button icon={<EditOutlined />} size="small" type="text" loading={isFetchingDetail && editingTrip?._id === r._id} onClick={() => openModal(r)} className="text-blue-600 hover:bg-blue-50" />
          </Tooltip>
          <Popconfirm title="Bạn chắc chắn muốn xóa?" onConfirm={() => handleDelete(r._id)}>
            <Tooltip title="Xóa">
              <Button icon={<DeleteOutlined />} size="small" type="text" danger className="hover:bg-red-50" />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Tool Bar phụ (Bên phải nút Thêm mới)
  const ExtraTools = (
    <div className="flex items-center gap-3">
      <Button 
        icon={<SyncOutlined />} 
        onClick={handleGenerateTrips}
        className="text-purple-600 border-purple-600 hover:bg-purple-50"
      >
        Sinh lịch tự động
      </Button>
      
      <DatePicker 
        value={filterDate} 
        onChange={(d) => setFilterDate(d)} 
        format="DD/MM/YYYY" 
        allowClear={false}
        placeholder="Lọc theo ngày"
        className="w-40"
      />
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <DataTable
        title="Quản lý Chuyến đi"
        columns={columns}
        dataSource={trips}
        loading={loading}
        onReload={fetchTrips}
        onAdd={() => openModal()}
        searchPlaceholder="Tìm theo tên tuyến, biển số..."
         searchFields={[
          'routeId.name',
          'busId.plateNumber',
          'driverId.name',
          'driverId.phone'
          ]}
        extraButtons={ExtraTools}
      />

      {/* Modal Quản lý Chuyến đi */}
      <TripModal
        open={isModalOpen}
        loading={submitting}
        initialValues={editingTrip}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        data={modalData} // Truyền toàn bộ data vào form con
      />
    </div>
  );
}