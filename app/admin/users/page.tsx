'use client';
import React, { useState, useEffect } from 'react';
import { Button, Switch, message, Avatar, Space, Popconfirm } from 'antd';
import { UserOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import DataTable from '@/components/DataTable';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch {
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        message.success('Đã cập nhật trạng thái');
        fetchUsers();
      } else {
        message.error('Cập nhật thất bại');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        message.success('Xóa user thành công');
        fetchUsers();
      } else {
        message.error(json.message || 'Xóa thất bại');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const columns = [
    { 
      title: 'Khách hàng', key: 'name', 
      render: (_: any, r: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={r.avatar} />
          <div>
            <div className="font-bold">{r.name}</div>
            <div className="text-xs text-gray-500">{r.email}</div>
          </div>
        </Space>
      ) 
    },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone' },
    { title: 'Ngày tham gia', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString('vi-VN') },
    {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    render: (role: string) => <span className="capitalize">{role}</span>
    },
    { 
      title: 'Trạng thái', 
      key: 'status',
      render: (_: any, r: any) => (
        <Switch 
          checked={r.isActive} 
          checkedChildren="Active" 
          unCheckedChildren="Locked"
          onChange={() => toggleStatus(r._id, r.isActive)}
          className={r.isActive ? "bg-green-500" : "bg-red-500"}
        />
      )
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, r: any) => (
        <Popconfirm
          title={`Bạn có chắc chắn muốn xóa ${r.name}?`}
          onConfirm={() => handleDelete(r._id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button danger icon={<DeleteOutlined />} size="small">
            Xóa
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <div className="p-6 bg-white rounded-lg">
      <DataTable
        title="Quản lý Khách hàng"
        columns={columns}
        dataSource={users}
        loading={loading}
        onReload={fetchUsers}
        searchFields={['name', 'email', 'phone','role']}
        searchPlaceholder="Tìm kiếm khách hàng..."
        extraButtons={null}
      />
    </div>
  );
}
