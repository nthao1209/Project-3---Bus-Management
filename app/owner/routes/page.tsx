'use client';

import React, { useEffect, useState } from 'react';
import { Button, Space, Popconfirm, message, Tag, Form } from 'antd';
import { EditOutlined, DeleteOutlined, SwapRightOutlined } from '@ant-design/icons';
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

  /* ================= TABLE ================= */

  const columns: ColumnsType<Route> = [
    {
      title: 'Tuyến',
      dataIndex: 'name',
      render: (_, r) => (
        <div>
          <b>{r.name}</b>
          <div className="text-xs text-gray-500">
            {r.startStationId?.province} <SwapRightOutlined /> {r.endStationId?.province}
          </div>
        </div>
      ),
    },
    {
      title: 'Hành động',
      render: (_, r) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditingRoute(r);
              form.setFieldsValue({
                ...r,
                startStationId: r.startStationId?._id,
                endStationId: r.endStationId?._id,
                defaultPickupPoints: r.defaultPickupPoints || [],
                defaultDropoffPoints: r.defaultDropoffPoints || [],
              });
              setRouteModalOpen(true);
            }}
          />
          <Popconfirm title="Xóa?" onConfirm={() => handleDelete(r._id)}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        title="Quản lý Tuyến đường"
        columns={columns}
        dataSource={routes}
        loading={loading}
        onAdd={() => {
          setEditingRoute(null);
          form.resetFields();
          setRouteModalOpen(true);
        }}
        onReload={fetchRoutes}
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
