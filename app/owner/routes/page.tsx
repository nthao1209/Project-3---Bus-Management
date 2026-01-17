'use client';

import React, { useEffect, useState } from 'react';
import { Button, Space, Popconfirm, message, Tag, Form, Card } from 'antd';
import { 
  EditOutlined, DeleteOutlined, SwapRightOutlined, 
  EnvironmentOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import DataTable from '@/components/DataTable';
import RouteModal from '@/components/RouteModal';
import StationModal from '@/components/StationModal';

interface Route {
  _id: string;
  name: string;
  startStationId: any;
  endStationId: any;
  distanceKm: number;
  durationMinutes: number;
  defaultPickupPoints?: any[];
  defaultDropoffPoints?: any[];
}

export default function OwnerRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [stationModalOpen, setStationModalOpen] = useState(false);

  const [form] = Form.useForm();

  const fetchRoutes = async () => {
    setLoading(true);
    const res = await fetch('/api/owner/routes');
    const data = await res.json();
    if (data.success) {
      setRoutes(data.data.map((r: any) => ({ ...r, id: r._id })));
    }
    setLoading(false);
  };

  const fetchStations = async () => {
    const res = await fetch('/api/owner/stations');
    const data = await res.json();

    if (data.success) {
      setStations(
        data.data.map((s: any) => ({
          label: (
            <div className="flex justify-between">
              <span>{s.name} ({s.province})</span>
              {s.status === 'pending' && <Tag color="orange">Chờ duyệt</Tag>}
            </div>
          ),
          value: s._id,
          name: s.name,
          address: s.address,      
          searchText: `${s.name} ${s.province} ${s.status}`,
        }))
      );
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchStations();
  }, []);

  const handleSubmit = async (values: any) => {
    const url = editingRoute
      ? `/api/owner/routes/${editingRoute._id}`
      : '/api/owner/routes';

    const method = editingRoute ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      message.success('Lưu tuyến thành công');
      setRouteModalOpen(false);
      setEditingRoute(null);
      form.resetFields();
      fetchRoutes();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/owner/routes/${id}`, { method: 'DELETE' });
    message.success('Đã xóa tuyến');
    fetchRoutes();
  };

  const openEdit = (r: Route) => {
    setEditingRoute(r);
    form.setFieldsValue({
      ...r,
      startStationId: r.startStationId?._id,
      endStationId: r.endStationId?._id,
      defaultPickupPoints: r.defaultPickupPoints || [],
      defaultDropoffPoints: r.defaultDropoffPoints || [],
    });
    setRouteModalOpen(true);
  };

  // --- TABLE COLUMNS (PC) ---
  const columns: ColumnsType<Route> = [
    {
      title: 'Tuyến',
      dataIndex: 'name',
      render: (_, r) => (
        <div>
          <b className="text-blue-700">{r.name}</b>
          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
            <EnvironmentOutlined />
            {r.startStationId?.province} <SwapRightOutlined /> {r.endStationId?.province}
          </div>
        </div>
      ),
    },
    {
      title: 'Hành động',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa?" onConfirm={() => handleDelete(r._id)}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // --- RENDER MOBILE ITEM ---
  const renderMobileItem = (item: Route) => (
    <Card
      size="small"
      title={<span className="font-bold text-blue-700">{item.name}</span>}
      className="border border-gray-200 shadow-sm"
      actions={[
        <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEdit(item)}>Sửa</Button>,
        <Popconfirm key="del" title="Xóa?" onConfirm={() => handleDelete(item._id)}>
            <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      ]}
    >
       <div className="flex flex-col gap-2 text-gray-600">
          <div className="flex items-center gap-2 text-sm">
             <EnvironmentOutlined className="text-green-600"/>
             <span className="font-medium">{item.startStationId?.name} ({item.startStationId?.province})</span>
          </div>
          <div className="pl-6"><SwapRightOutlined className="rotate-90 md:rotate-0 text-gray-400"/></div>
          <div className="flex items-center gap-2 text-sm">
             <EnvironmentOutlined className="text-red-600"/>
             <span className="font-medium">{item.endStationId?.name} ({item.endStationId?.province})</span>
          </div>
       </div>
    </Card>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <DataTable
        title={<span className="text-xl font-bold">Quản lý Tuyến đường</span>}
        columns={columns}
        dataSource={routes}
        loading={loading}
        onAdd={() => {
          setEditingRoute(null);
          form.resetFields();
          setRouteModalOpen(true);
        }}
        onReload={fetchRoutes}
        renderMobileItem={renderMobileItem} // <-- TRUYỀN HÀM RENDER MOBILE
      />

      <RouteModal
        open={routeModalOpen}
        onCancel={() => setRouteModalOpen(false)}
        onSubmit={handleSubmit}
        onOpenStationModal={() => setStationModalOpen(true)}
        form={form}
        editing={!!editingRoute}
        stations={stations}
      />

      <StationModal
        open={stationModalOpen}
        onCancel={() => setStationModalOpen(false)}
        onSubmit={async (values) => {
          await fetch('/api/owner/stations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          message.success('Đã gửi yêu cầu, chờ duyệt');
          setStationModalOpen(false);
          fetchStations();
        }}
      />
    </div>
  );
}