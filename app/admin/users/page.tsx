'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Switch, message, Avatar, Space, Popconfirm, Card, Tag 
} from 'antd';
import { 
  UserOutlined, DeleteOutlined, MailOutlined, 
  PhoneOutlined, CalendarOutlined, SafetyCertificateOutlined 
} from '@ant-design/icons';
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
        // Cập nhật state local ngay lập tức để UI phản hồi nhanh
        setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !currentStatus } : u));
      } else {
        message.error('Cập nhật thất bại');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, { method: 'DELETE' });
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

  // --- COLUMN CHO PC ---
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
      render: (role: string) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role.toUpperCase()}</Tag>
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
          title={`Xóa ${r.name}?`}
          onConfirm={() => handleDelete(r._id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button danger icon={<DeleteOutlined />} size="small">Xóa</Button>
        </Popconfirm>
      )
    }
  ];

  const renderMobileItem = (item: any) => (
    <Card 
      size="small" 
      className="shadow-sm border-gray-200"
      bodyStyle={{ padding: '12px' }}
    >
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
                <Avatar 
                    size={48} 
                    icon={<UserOutlined />} 
                    src={item.avatar} 
                    className="bg-blue-100 text-blue-600"
                />
                <div>
                    <div className="font-bold text-base text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <MailOutlined /> {item.email}
                    </div>
                </div>
            </div>
            <Tag color={item.role === 'admin' ? 'red' : 'blue'}>{item.role}</Tag>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3">
            <div className="flex items-center gap-2">
                <PhoneOutlined /> <span>{item.phone || '---'}</span>
            </div>
            <div className="flex items-center gap-2">
                <CalendarOutlined /> <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Trạng thái:</span>
                <Switch 
                    checked={item.isActive} 
                    size="small"
                    onChange={() => toggleStatus(item._id, item.isActive)}
                    className={item.isActive ? "bg-green-500" : "bg-red-500"}
                />
            </div>
            
            <Popconfirm
                title="Xóa tài khoản này?"
                onConfirm={() => handleDelete(item._id)}
                okText="Xóa"
                cancelText="Hủy"
            >
                <Button type="text" danger icon={<DeleteOutlined />} size="small">
                    Xóa
                </Button>
            </Popconfirm>
        </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg min-h-screen">
      <DataTable
        title={<span className="text-xl font-bold">Quản lý Khách hàng</span>}
        columns={columns}
        dataSource={users}
        loading={loading}
        onReload={fetchUsers}
        searchFields={['name', 'email', 'phone', 'role']}
        searchPlaceholder="Tìm kiếm khách hàng..."
        renderMobileItem={renderMobileItem} // <-- TRUYỀN HÀM RENDER MOBILE
      />
    </div>
  );
}