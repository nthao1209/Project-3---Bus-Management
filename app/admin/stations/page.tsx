'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Modal, Form, Input, Select, Tabs, Tag, message, Space, Popconfirm 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, CompassOutlined 
} from '@ant-design/icons';
import DataTable from '@/components/DataTable';
import provincesData from '@/public/provinces.json'

export default function StationPage() {
  const [activeStations, setActiveStations] = useState<any[]>([]);
  const [pendingStations, setPendingStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();
  const [provinces, setProvinces] = useState<{label: string, value: string}[]>([]);

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

    } catch (error) {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    setProvinces(provincesData);
    fetchStations(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      const url = editingItem 
        ? `/api/admin/stations/${editingItem._id}` 
        : '/api/admin/stations';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (res.ok) {
        message.success(editingItem ? 'Cập nhật thành công' : 'Thêm mới thành công');
        setIsModalOpen(false);
        setEditingItem(null);
        form.resetFields();
        fetchStations();
      } else {
        message.error('Có lỗi xảy ra');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const handleApprove = async (id: string, action: 'active' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/stations/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      });
      if (res.ok) {
        message.success(`Đã ${action === 'active' ? 'duyệt' : 'từ chối'} bến xe`);
        fetchStations();
      }
    } catch { message.error('Lỗi kết nối'); }
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

  const openEdit = (record: any) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const columnsActive = [
    { title: 'Tên bến xe', dataIndex: 'name', key: 'name', render: (t:string) => <b>{t}</b> },
    { title: 'Tỉnh/Thành', dataIndex: 'province', key: 'province', filters: provinces.map(p => ({ text: p.label, value: p.value })), onFilter: (value: any, record: any) => record.province === value },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    { title: 'Loại', dataIndex: 'type', key: 'type', render: (t:string) => <Tag color="blue">{t}</Tag> },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)}/>
          <Popconfirm title="Xóa bến xe này?" onConfirm={() => handleDelete(r._id)}>
            <Button danger icon={<DeleteOutlined />} size="small"/>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const columnsPending = [
    { title: 'Tên đề xuất', dataIndex: 'name', key: 'name', render: (t:string) => <b>{t}</b> },
    { title: 'Người đề xuất', dataIndex: 'creatorId', key: 'creatorId', render: (u: any) => u?.name || 'Ẩn danh' },
    { title: 'Tỉnh/Thành', dataIndex: 'province', key: 'province' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    {
      title: 'Duyệt',
      key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(r._id, 'active')} className="bg-green-600 hover:bg-green-500">
            Duyệt
          </Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => handleApprove(r._id, 'rejected')}>
            Từ chối
          </Button>
        </Space>
      )
    }
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
        />
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Quản lý Bến xe & Điểm đón trả</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); form.resetFields(); setIsModalOpen(true); }}>
          Thêm Bến xe
        </Button>
      </div>

      <Tabs defaultActiveKey="1" items={items} />

      <Modal title={editingItem ? "Cập nhật bến xe" : "Thêm bến xe mới"} open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={form.submit}>
         <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item name="name" label="Tên địa điểm" rules={[{ required: true }]}>
                <Input prefix={<CompassOutlined />} placeholder="Vd: Bến xe Mỹ Đình" />
            </Form.Item>
            <Form.Item name="province" label="Tỉnh/Thành phố" rules={[{ required: true }]}>
                <Select showSearch options={provinces} placeholder="Chọn tỉnh thành" />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ chi tiết" rules={[{ required: true }]}>
                <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="type" label="Loại địa điểm" initialValue="bus_station">
                <Select>
                    <Select.Option value="bus_station">Bến xe khách</Select.Option>
                    <Select.Option value="office">Văn phòng nhà xe</Select.Option>
                    <Select.Option value="rest_stop">Trạm dừng nghỉ</Select.Option>
                </Select>
            </Form.Item>
         </Form>
      </Modal>
    </div>
  );
}
