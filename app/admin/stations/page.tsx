'use client';

import React, { useState, useEffect } from 'react';
import {
  Button, Tabs, Tag, message, Space, Popconfirm
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';

import DataTable from '@/components/DataTable';
import StationModal from '@/components/StationModal';

export default function StationPage() {
  const [activeStations, setActiveStations] = useState<any[]>([]);
  const [pendingStations, setPendingStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [provinces, setProvinces] = useState<{ label: string; value: string }[]>([]);

  /* ================= FETCH DATA ================= */
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

  /* ================= CRUD ================= */
  const handleSubmit = async (values: any) => {
    try {
      const url = editingItem
        ? `/api/admin/stations/${editingItem._id}`
        : '/api/admin/stations';

      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success(editingItem ? 'Cập nhật thành công' : 'Thêm mới thành công');
        setIsModalOpen(false);
        setEditingItem(null);
        fetchStations();
      } else {
        message.error('Có lỗi xảy ra');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const handleApprove = async (id: string, status: 'active' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/stations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        message.success(status === 'active' ? 'Đã duyệt bến xe' : 'Đã từ chối');
        fetchStations();
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/stations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('Đã xóa bến xe');
        fetchStations();
      } else {
        message.error('Xóa thất bại');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  /* ================= UI HANDLER ================= */
  const openCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditingItem(record);
    setIsModalOpen(true);
  };

  /* ================= TABLE COLUMNS ================= */
  const columnsActive = [
    {
      title: 'Tên bến xe',
      dataIndex: 'name',
      key: 'name',
      render: (t: string) => <b>{t}</b>,
    },
    {
      title: 'Tỉnh/Thành',
      dataIndex: 'province',
      key: 'province',
      filters: provinces.map(p => ({ text: p.label, value: p.value })),
      onFilter: (value: any, record: any) => record.province === value,
    },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Xóa bến xe này?" onConfirm={() => handleDelete(r._id)}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const columnsPending = [
    {
      title: 'Tên đề xuất',
      dataIndex: 'name',
      key: 'name',
      render: (t: string) => <b>{t}</b>,
    },
    {
      title: 'Người đề xuất',
      dataIndex: 'creatorId',
      key: 'creatorId',
      render: (u: any) => u?.name || 'Ẩn danh',
    },
    { title: 'Tỉnh/Thành', dataIndex: 'province', key: 'province' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    {
      title: 'Duyệt',
      key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            className="bg-green-600 hover:bg-green-500"
            onClick={() => handleApprove(r._id, 'active')}
          >
            Duyệt
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => handleApprove(r._id, 'rejected')}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

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
        />
      ),
    },
    {
      key: '2',
      label: (
        <span>
          Yêu cầu chờ duyệt
          {pendingStations.length > 0 && (
            <Tag color="red" className="ml-2">
              {pendingStations.length}
            </Tag>
          )}
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
        />
      ),
    },
  ];

  /* ================= RENDER ================= */
  return (
    <div className="p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Quản lý Bến xe & Điểm đón trả</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm Bến xe
        </Button>
      </div>

      <Tabs defaultActiveKey="1" items={items} />

      <StationModal
        open={isModalOpen}
        initialValues={editingItem}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
