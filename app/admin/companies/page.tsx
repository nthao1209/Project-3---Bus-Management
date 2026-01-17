'use client';

import React, { useState, useEffect } from 'react';
import { Button, Space, Tag, message, Tabs, Card, Typography } from 'antd';
import { 
  CheckCircleOutlined, CloseCircleOutlined, 
  PhoneOutlined, UserOutlined, CalendarOutlined 
} from '@ant-design/icons';
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

  // --- COLUMN PC ---
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
          <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record._id, 'active')} className="bg-green-600 hover:bg-green-500">Duyệt</Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => handleApprove(record._id, 'inactive')}>Từ chối</Button>
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

  // --- RENDER MOBILE ---
  const renderPendingMobile = (item: Company) => (
    <Card 
      size="small"
      title={<span className="text-blue-600 font-bold">{item.name}</span>}
      className="border border-gray-200 shadow-sm"
      actions={[
        <Button key="ok" type="text" className="text-green-600 font-medium" icon={<CheckCircleOutlined />} onClick={() => handleApprove(item._id, 'active')}>Duyệt</Button>,
        <Button key="no" type="text" danger icon={<CloseCircleOutlined />} onClick={() => handleApprove(item._id, 'inactive')}>Từ chối</Button>
      ]}
    >
      <div className="flex flex-col gap-2 text-gray-600 text-sm">
        <div className="flex items-center gap-2"><UserOutlined /> <span>Chủ: {item.ownerName}</span></div>
        <div className="flex items-center gap-2"><PhoneOutlined /> <a href={`tel:${item.hotline}`}>{item.hotline}</a></div>
        <div className="flex items-center gap-2"><CalendarOutlined /> <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span></div>
      </div>
    </Card>
  );

  const renderActiveMobile = (item: Company) => (
    <Card 
      size="small"
      title={<span className="text-blue-600 font-bold">{item.name}</span>}
      extra={<Tag color={item.status === 'active' ? 'green' : 'red'}>{item.status === 'active' ? 'Hoạt động' : 'Dừng'}</Tag>}
      className="border border-gray-200 shadow-sm"
    >
       <div className="flex flex-col gap-2 text-gray-600 text-sm">
        <div className="flex items-center gap-2"><UserOutlined /> <span className="font-medium">{item.ownerName}</span></div>
        <div className="flex items-center gap-2"><PhoneOutlined /> <a href={`tel:${item.hotline}`} className="text-blue-500">{item.hotline}</a></div>
        <div className="flex items-center gap-2 text-xs text-gray-400"><CalendarOutlined /> <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span></div>
      </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800">Quản lý Nhà xe</h2>

      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Chờ duyệt" key="1">
          <DataTable
            title="Danh sách chờ duyệt"
            columns={pendingColumns}
            dataSource={pendingCompanies}
            loading={loadingPending}
            onReload={fetchPendingCompanies}
            searchFields={['name', 'ownerName', 'hotline']}
            searchPlaceholder="Tìm tên, hotline..."
            renderMobileItem={renderPendingMobile}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Đã duyệt" key="2">
          <DataTable
            title="Danh sách đã duyệt"
            columns={activeColumns}
            dataSource={activeCompanies}
            loading={loadingActive}
            onReload={fetchActiveCompanies}
            searchFields={['name', 'ownerName', 'hotline']}
            searchPlaceholder="Tìm tên, hotline..."
            renderMobileItem={renderActiveMobile}
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}