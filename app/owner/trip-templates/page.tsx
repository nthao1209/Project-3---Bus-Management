'use client';

import React, { useEffect, useState } from 'react';
import { Button, message, Popconfirm, Space, Tag, Card } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CarOutlined,
  DollarOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable';
import TripTemplateModal from '@/components/TripTemplateModal';

interface TripTemplate {
  _id: string;
  id: string;
  routeId?: { _id: string; name: string };
  busId?: { _id: string; plateNumber: string };
  driverId?: { _id: string; name: string };
  departureTimeStr: string;
  daysOfWeek: number[];
  basePrice: number;
  durationMinutes: number;
}

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function TripTemplatesPage() {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TripTemplate | null>(null);

  const [data, setData] = useState({
    companies: [], routes: [], buses: [], drivers: [], fullRoutes: []
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, rRes, bRes, dRes] = await Promise.all([
        fetch('/api/owner/trip-templates'),
        fetch('/api/owner/companies'),
        fetch('/api/owner/routes'),
        fetch('/api/owner/buses'),
        fetch('/api/owner/drivers')
      ]);

      const [tData, cData, rData, bData, dData] = await Promise.all([
        tRes.json(), cRes.json(), rRes.json(), bRes.json(), dRes.json()
      ]);

      if (tData.success) {
        setTemplates(tData.data.map((t: any) => ({ ...t, id: t._id })));
      }

      setData({
        companies: cData.data?.map((c: any) => ({ label: c.name, value: c._id })) || [],
        routes: rData.data?.map((r: any) => ({ label: r.name, value: r._id })) || [],
        fullRoutes: rData.data || [],
        buses: bData.data?.map((b: any) => ({ label: `${b.plateNumber}`, value: b._id })) || [],
        drivers: dData.data?.map((d: any) => ({ label: `${d.name}`, value: d._id })) || []
      });
    } catch {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSubmit = async (values: any) => {
    const url = editing ? `/api/owner/trip-templates/${editing._id}` : '/api/owner/trip-templates';
    const method = editing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });

    if (res.ok) {
      message.success(editing ? 'Đã cập nhật' : 'Đã tạo');
      setModalOpen(false);
      setEditing(null);
      fetchAll();
    } else {
      const err = await res.json();
      message.error(err.message || 'Lỗi lưu dữ liệu');
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/owner/trip-templates/${id}`, { method: 'DELETE' });
    message.success('Đã xoá');
    fetchAll();
  };

  const openEdit = (r: TripTemplate) => {
    setEditing(r);
    setModalOpen(true);
  };

  // --- COLUMNS (PC) ---
  const columns: ColumnsType<TripTemplate> = [
    { title: 'Tuyến', render: (_, r) => <b>{r.routeId?.name}</b> },
    { title: 'Xe', render: (_, r) => r.busId ? <Tag icon={<CarOutlined />} color="blue">{r.busId.plateNumber}</Tag> : <Tag>Đã xoá</Tag> },
    { title: 'Giờ chạy', dataIndex: 'departureTimeStr', render: (t) => <Tag icon={<ClockCircleOutlined />} color="green">{t}</Tag> },
    { title: 'Ngày chạy', dataIndex: 'daysOfWeek', render: (days: number[]) => days.map(d => <Tag key={d} color="geekblue">{DAYS[d]}</Tag>) },
    { title: 'Giá vé', dataIndex: 'basePrice', render: p => <b className="text-green-600">{p?.toLocaleString()}đ</b> },
    {
      title: 'Hành động',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <Popconfirm title="Xoá?" onConfirm={() => handleDelete(r._id)}>
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // --- MOBILE RENDER ---
  const renderMobileItem = (item: TripTemplate) => (
    <Card
      size="small"
      title={<span className="font-bold text-blue-700">{item.routeId?.name}</span>}
      extra={<span className="text-green-600 font-bold">{item.departureTimeStr}</span>}
      className="border border-gray-200 shadow-sm"
      actions={[
        <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEdit(item)}>Sửa</Button>,
        <Popconfirm key="del" title="Xóa?" onConfirm={() => handleDelete(item._id)}>
            <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      ]}
    >
       <div className="flex flex-col gap-2 text-gray-600 text-sm">
          <div className="flex items-center gap-2">
             <CarOutlined /> 
             <span>Xe: <Tag className="m-0">{item.busId?.plateNumber || '---'}</Tag></span>
          </div>
          <div className="flex items-center gap-2">
             <DollarOutlined /> 
             <span>Giá vé: <span className="font-medium text-green-600">{item.basePrice?.toLocaleString()} đ</span></span>
          </div>
          <div className="flex items-start gap-2">
             <CalendarOutlined className="mt-1" />
             <div className="flex flex-wrap gap-1">
                {item.daysOfWeek.map(d => <Tag key={d} color="geekblue" className="m-0 text-xs">{DAYS[d]}</Tag>)}
             </div>
          </div>
       </div>
    </Card>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <DataTable
        title={<span className="text-xl font-bold">Lịch chạy cố định</span>}
        columns={columns}
        dataSource={templates}
        loading={loading}
        onReload={fetchAll}
        onAdd={() => {
          setEditing(null);
          setModalOpen(true);
        }}
        renderMobileItem={renderMobileItem} // <-- TRUYỀN HÀM RENDER MOBILE
      />

      <TripTemplateModal
        open={modalOpen}
        loading={loading}
        initialValues={editing}
        data={data}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}