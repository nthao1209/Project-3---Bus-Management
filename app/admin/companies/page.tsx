'use client';

import React, { useState, useEffect } from 'react';
import { Button, Space, Tag, message, Tabs } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import DataTable from '@/components/DataTable';

interface Company {
  _id: string;
  name: string;
  ownerName: string;
  hotline: string;
  status: 'pending' | 'active' | 'inactive';
  createdAt: string;
}

export default function CompaniesPage() {
  const [pendingCompanies, setPendingCompanies] = useState<Company[]>([]);
  const [activeCompanies, setActiveCompanies] = useState<Company[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);

  const fetchPendingCompanies = async () => {
    try {
      setLoadingPending(true);
      const res = await fetch('/api/admin/companies?status=pending');
      const data = await res.json();
      if (data.success) setPendingCompanies(data.data);
    } catch (error) {
      message.error('Không thể tải dữ liệu chờ duyệt');
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchActiveCompanies = async () => {
  try {
    setLoadingActive(true);

    const resActive = await fetch('/api/admin/companies?status=active');
    const activeData = await resActive.json();

    const resInactive = await fetch('/api/admin/companies?status=inactive');
    const inactiveData = await resInactive.json();

    if (activeData.success && inactiveData.success) {
      setActiveCompanies([...activeData.data, ...inactiveData.data]);
    }
  } catch (error) {
    message.error('Không thể tải dữ liệu nhà xe đã duyệt');
  } finally {
    setLoadingActive(false);
  }
};


  useEffect(() => {
    fetchPendingCompanies();
    fetchActiveCompanies();
  }, []);

  const handleApprove = async (id: string, action: 'active' | 'inactive') => {
    try {
      const res = await fetch(`/api/admin/companies/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        message.success(`Đã ${action === 'active' ? 'duyệt' : 'từ chối'} nhà xe`);
        fetchPendingCompanies();
        fetchActiveCompanies();
      } else {
        message.error('Có lỗi xảy ra');
      }
    } catch {
      message.error('Lỗi kết nối');
    }
  };

  const columns = [
    { title: 'Tên nhà xe', dataIndex: 'name', key: 'name', render: (text: string) => <b className="text-blue-600">{text}</b> },
    { title: 'Hotline', dataIndex: 'hotline', key: 'hotline' },
    { title: 'Chủ sở hữu', dataIndex: 'ownerName', key: 'ownerName' },
    { title: 'Ngày đăng ký', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => new Date(date).toLocaleDateString('vi-VN') },
  ];

  const pendingColumns = [
    ...columns,
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: Company) => (
        <Space>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record._id, 'active')} className="bg-green-600 hover:bg-green-500">
            Duyệt
          </Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => handleApprove(record._id, 'inactive')}>
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  const activeColumns = [
    ...columns,
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{status === 'active' ? 'Hoạt động' : 'Không hoạt động'}</Tag>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Quản lý Nhà xe</h2>

      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Chờ duyệt" key="1">
          <DataTable
            title="Danh sách nhà xe chờ duyệt"
            columns={pendingColumns}
            dataSource={pendingCompanies}
            loading={loadingPending}
            onReload={fetchPendingCompanies}
            searchFields={['name', 'ownerName', 'hotline']}
            searchPlaceholder="Tìm kiếm nhà xe..."
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Đã duyệt" key="2">
          <DataTable
            title="Danh sách nhà xe đã duyệt"
            columns={activeColumns}
            dataSource={activeCompanies}
            loading={loadingActive}
            onReload={fetchActiveCompanies}
            searchFields={['name', 'ownerName', 'hotline']}
            searchPlaceholder="Tìm kiếm nhà xe..."
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
