'use client';

import React, { useState, useEffect } from 'react';
import {
  Button, Tabs, Tag, message, Space, Popconfirm, Card, Typography
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  EnvironmentOutlined, CompassOutlined
} from '@ant-design/icons';

import DataTable from '@/components/DataTable';
import StationModal from '@/components/StationModal';

export default function StationPage() {
  // ... (Giữ nguyên phần state và fetch logic)
  const [activeStations, setActiveStations] = useState<any[]>([]);
  const [pendingStations, setPendingStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [provinces, setProvinces] = useState<{ label: string; value: string }[]>([]);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const [resActive, resPending] = await Promise.all([
        fetch('/api/admin/stations?status=active'),
        fetch('/api/admin/stations?status=pending'),
      ]);

      const dataActive = await resActive.json();
      const dataPending = await resPending.json();

      if (dataActive.success) setActiveStations(dataActive.data);
      if (dataPending.success) setPendingStations(dataPending.data);
    } catch {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // ... (Giữ nguyên handleCRUD: handleSubmit, handleApprove, handleDelete, openCreate, openEdit)
  const handleSubmit = async (values: any) => { /* Code cũ */ };
  const handleApprove = async (id: string, status: 'active' | 'rejected') => {
      try {
      const res = await fetch(`/api/admin/stations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { message.success('Thao tác thành công'); fetchStations(); }
    } catch { message.error('Lỗi kết nối'); }
  };
  const handleDelete = async (id: string) => { 
      try {
        const res = await fetch(`/api/admin/stations/${id}`, { method: 'DELETE' });
        if (res.ok) { message.success('Đã xóa'); fetchStations(); }
      } catch { message.error('Lỗi kết nối'); }
  };

  const openCreate = () => { setEditingItem(null); setIsModalOpen(true); };
  const openEdit = (record: any) => { setEditingItem(record); setIsModalOpen(true); };

  // ... (Giữ nguyên columnsActive và columnsPending cho Desktop)
  const columnsActive = [
    { title: 'Tên bến xe', dataIndex: 'name', key: 'name', render: (t: string) => <b>{t}</b> },
    { title: 'Tỉnh/Thành', dataIndex: 'province', key: 'province' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    { title: 'Loại', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color="blue">{t}</Tag> },
    {
      title: 'Hành động', key: 'action', render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa?" onConfirm={() => handleDelete(r._id)}><Button danger size="small" icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    },
  ];

  const columnsPending = [
    { title: 'Tên đề xuất', dataIndex: 'name', key: 'name', render: (t: string) => <b>{t}</b> },
    { title: 'Người đề xuất', dataIndex: 'creatorId', key: 'creatorId', render: (u: any) => u?.name || 'Ẩn danh' },
    { title: 'Tỉnh/Thành', dataIndex: 'province', key: 'province' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    {
      title: 'Duyệt', key: 'action', render: (_: any, r: any) => (
        <Space>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />} className="bg-green-600" onClick={() => handleApprove(r._id, 'active')}>Duyệt</Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => handleApprove(r._id, 'rejected')}>Từ chối</Button>
        </Space>
      ),
    },
  ];

  // --- RENDERING CHO MOBILE (Mới thêm) ---

  // 1. Mobile card cho Bến xe hoạt động
  const renderActiveMobile = (item: any) => (
    <Card 
      size="small"
      title={<span className="font-semibold">{item.name}</span>}
      extra={<Tag color="blue">{item.type}</Tag>}
      className="border border-gray-200 shadow-sm"
      actions={[
        <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEdit(item)}>Sửa</Button>,
        <Popconfirm key="del" title="Xóa?" onConfirm={() => handleDelete(item._id)}>
            <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      ]}
    >
       <div className="text-gray-600 flex flex-col gap-1">
          <div className="flex gap-2"><EnvironmentOutlined className="mt-1" /> <span>{item.address}</span></div>
          <div className="flex gap-2"><CompassOutlined className="mt-1" /> <span className="font-medium">{item.province}</span></div>
       </div>
    </Card>
  );

  // 2. Mobile card cho Bến xe chờ duyệt
  const renderPendingMobile = (item: any) => (
    <Card 
      size="small"
      title={<span className="font-semibold text-orange-600">{item.name}</span>}
      className="border border-gray-200 shadow-sm"
      actions={[
        <Button key="ok" type="text" className="text-green-600 font-bold" icon={<CheckCircleOutlined />} onClick={() => handleApprove(item._id, 'active')}>Duyệt</Button>,
        <Button key="no" type="text" danger icon={<CloseCircleOutlined />} onClick={() => handleApprove(item._id, 'rejected')}>Huỷ</Button>
      ]}
    >
        <div className="text-gray-600 flex flex-col gap-1 text-sm">
            <div><span className="font-medium text-gray-800">Người gửi:</span> {item.creatorId?.name || 'Ẩn danh'}</div>
            <div className="flex gap-2"><EnvironmentOutlined /> {item.address}, {item.province}</div>
        </div>
    </Card>
  );

  const items = [
    {
      key: '1',
      label: 'Đang hoạt động',
      children: (
        <DataTable
          title="Bến xe đang hoạt động"
          columns={columnsActive}
          dataSource={activeStations}
          loading={loading}
          searchFields={['name', 'address']}
          onReload={fetchStations}
          renderMobileItem={renderActiveMobile} // <-- Truyền prop này
        />
      ),
    },
    {
      key: '2',
      label: (
        <span>
          Yêu cầu chờ duyệt
          {pendingStations.length > 0 && <Tag color="red" className="ml-2">{pendingStations.length}</Tag>}
        </span>
      ),
      children: (
        <DataTable
          title="Bến xe chờ duyệt"
          columns={columnsPending}
          dataSource={pendingStations}
          loading={loading}
          searchFields={['name', 'address']}
          onReload={fetchStations}
          renderMobileItem={renderPendingMobile} // <-- Truyền prop này
        />
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h2 className="text-xl font-bold">Quản lý Bến xe</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="w-full md:w-auto">
          Thêm Bến xe
        </Button>
      </div>

      <Tabs defaultActiveKey="1" items={items} />

      <StationModal
        open={isModalOpen}
        initialValues={editingItem}
        onCancel={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}