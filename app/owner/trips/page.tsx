'use client';

import { useState, useEffect } from 'react';
import { 
  Button, DatePicker, Tag, message, Space, Popconfirm, Avatar, Tooltip, Select, Card 
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, 
  UserOutlined, ClockCircleOutlined, CarOutlined, EnvironmentOutlined, SyncOutlined, 
  DollarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable'; 
import TripModal from '@/components/TripModal'; 
import dayjs, { Dayjs } from 'dayjs';
import GenerateTripModal from '@/components/GenerateTripModal';

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
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const statusOptions = [
    { value: 'scheduled', label: 'Sắp chạy', color: 'blue' },
    { value: 'running', label: 'Đang chạy', color: 'green' },
    { value: 'completed', label: 'Hoàn thành', color: 'gray' },
    { value: 'cancelled', label: 'Đã hủy', color: 'red' },
  ];

  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const [modalData, setModalData] = useState<{
    companies: any[];
    routes: any[];
    fullRoutes: any[];
    buses: any[];
    drivers: any[];
    stations: any[];
  }>({ companies: [], routes: [], fullRoutes: [], buses: [], drivers: [], stations: [] });

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
        setTrips(data.data);
      }
    } catch (err) {
      message.error('Lỗi tải danh sách chuyến đi');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [resComp, resRoutes, resBuses, resDrivers, resStations] = await Promise.all([
        fetch('/api/owner/companies'), 
        fetch('/api/owner/routes'),    
        fetch('/api/owner/buses'),     
        fetch('/api/owner/drivers'),   
        fetch('/api/owner/stations')   
      ]);

      const [dComp, dRoutes, dBuses, dDrivers, dStations] = await Promise.all([
        resComp.json(), resRoutes.json(), resBuses.json(), resDrivers.json(), resStations.json()
      ]);
      
      setModalData({
        companies: dComp.data?.map((c: any) => ({ label: c.name, value: c._id })) || [],
        routes: dRoutes.data?.map((r: any) => ({ label: r.name, value: r._id })) || [],
        fullRoutes: dRoutes.data || [], 
        buses: dBuses.data?.map((b: any) => ({ label: `${b.plateNumber} (${b.type})`, value: b._id })) || [],
        drivers: dDrivers.data?.map((d: any) => ({ label: `${d.name} - ${d.phone}`, value: d._id })) || [],
        stations: dStations.data?.map((s: any) => ({ label: s.name, value: s._id, address: s.address })) || [],
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

   const handleStatusChange = async (tripId: string, newStatus: string) => {
    setUpdatingStatusId(tripId);
    try {
      const res = await fetch(`/api/owner/trips/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();

      if (res.ok) {
        message.success('Cập nhật trạng thái thành công');
        setTrips((prev) => 
          prev.map((t) => t._id === tripId ? { ...t, status: newStatus as any } : t)
        );
      } else {
        message.error(json.message || 'Lỗi cập nhật trạng thái');
        fetchTrips(); 
      }
    } catch (error) {
      message.error('Lỗi kết nối');
    } finally {
      setUpdatingStatusId(null);
    }
  };

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
        fetchTrips();
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch {
      message.error('Lỗi kết nối server');
    } finally {
      setSubmitting(false);
    }
  };

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

  // --- COLUMNS PC ---
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
      width: 160,
      render: (currentStatus, record) => (
        <Select
          value={currentStatus}
          style={{ width: '100%' }}
          size="small"
          loading={updatingStatusId === record._id} 
          onChange={(newVal) => handleStatusChange(record._id, newVal)}
          options={statusOptions.map(opt => ({
             value: opt.value,
             label: (
               <Space>
                 <span className={`inline-block w-2 h-2 rounded-full bg-${opt.color === 'gray' ? 'gray-400' : opt.color + '-500'}`}></span>
                 <span className={`text-${opt.color === 'gray' ? 'gray-500' : opt.color + '-600'}`}>{opt.label}</span>
               </Space>
             )
          }))}
        />
      )
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
          <Popconfirm title="Xóa?" onConfirm={() => handleDelete(r._id)}>
             <Button icon={<DeleteOutlined />} size="small" type="text" danger className="hover:bg-red-50" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // --- RENDER MOBILE ITEM ---
  const renderMobileItem = (item: Trip) => (
    <Card
      size="small"
      title={<span className="font-bold text-blue-700">{item.routeId?.name}</span>}
      extra={<span className="text-sm text-gray-500">{dayjs(item.departureTime).format('DD/MM/YYYY')}</span>}
      className="border border-gray-200 shadow-sm"
      actions={[
        <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openModal(item)}>Sửa</Button>,
        <Popconfirm key="del" title="Xóa?" onConfirm={() => handleDelete(item._id)}>
            <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      ]}
    >
       <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
             <div className="flex items-center gap-1 font-medium">
                <ClockCircleOutlined className="text-green-600"/>
                {dayjs(item.departureTime).format('HH:mm')} - {dayjs(item.arrivalTime).format('HH:mm')}
             </div>
             <div className="flex items-center gap-1 font-medium text-green-600 justify-end">
                <DollarOutlined /> {item.basePrice?.toLocaleString()} đ
             </div>
          </div>
          
          <div className="flex flex-col gap-1 text-sm text-gray-600 bg-gray-50 p-2 rounded">
             <div className="flex items-center gap-2">
                <CarOutlined /> {item.busId?.plateNumber} <span className="text-xs text-gray-400">({item.busId?.type})</span>
             </div>
             <div className="flex items-center gap-2">
                <UserOutlined /> {item.driverId?.name || 'Chưa phân công'}
             </div>
          </div>

          <div>
            <Select
              value={item.status}
              style={{ width: '100%' }}
              loading={updatingStatusId === item._id}
              onChange={(newVal) => handleStatusChange(item._id, newVal)}
              options={statusOptions.map(opt => ({
                value: opt.value,
                label: opt.label
              }))}
            />
          </div>
       </div>
    </Card>
  );

  const ExtraTools = (
    <div className="flex items-center gap-2 w-full md:w-auto">
      <Button
        icon={<SyncOutlined />}
        onClick={() => setIsGenerateModalOpen(true)}
        className="text-purple-600 border-purple-600 hover:bg-purple-50 hidden md:inline-flex"
      >
        Sinh lịch
      </Button>
      {/* Nút Sinh lịch bản mobile (icon only) */}
      <Button
        icon={<SyncOutlined />}
        onClick={() => setIsGenerateModalOpen(true)}
        className="text-purple-600 border-purple-600 hover:bg-purple-50 md:hidden"
      />
      
      <DatePicker 
        value={filterDate} 
        onChange={(d) => setFilterDate(d)} 
        format="DD/MM/YYYY" 
        allowClear={false}
        placeholder="Ngày"
        className="flex-1 md:w-40"
      />
    </div>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <DataTable
        title={<span className="text-xl font-bold">Quản lý Chuyến đi</span>}
        columns={columns}
        dataSource={trips}
        loading={loading}
        onReload={fetchTrips}
        onAdd={() => openModal()}
        searchPlaceholder="Tìm tuyến, xe, tài xế..."
         searchFields={[
          'routeId.name',
          'busId.plateNumber',
          'driverId.name',
          'driverId.phone'
          ]}
        extraButtons={ExtraTools}
        renderMobileItem={renderMobileItem} // <-- TRUYỀN HÀM RENDER MOBILE
      />

      <GenerateTripModal
        open={isGenerateModalOpen}
        onCancel={() => setIsGenerateModalOpen(false)}
        onSuccess={() => { fetchTrips(); }}
      />

      <TripModal
        open={isModalOpen}
        loading={submitting}
        initialValues={editingTrip}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        data={modalData}
      />
    </div>
  );
}