'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, message, Space, Popconfirm, Avatar, Typography, Card 
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, 
  ShopOutlined, PhoneOutlined, 
  EnvironmentOutlined, MailOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable';
import CompanyModal from '@/components/CompanyModal';

const { Text } = Typography;

interface Company {
  id: string; 
  _id: string;
  name: string;
  hotline: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
}

export default function OwnerCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<Company> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner/companies');
      const data = await res.json();
      if (data.success) {
        setCompanies(
          data.data.map((item: any) => ({
            ...item,
            id: item._id,
          }))
        );
      }
    } catch {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const isEditMode = editingCompany && editingCompany._id;
      const url = isEditMode
        ? `/api/owner/companies/${editingCompany._id}` 
        : '/api/owner/companies';
      
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();

      if (res.ok) {
        message.success(isEditMode ? 'Cập nhật thành công' : 'Đăng ký thành công');
        setIsModalOpen(false);
        setEditingCompany(null);
        fetchData();
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/companies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('Đã xóa nhà xe');
        setCompanies(prev => prev.filter(c => c._id !== id));
      } else {
        message.error('Không thể xóa nhà xe này');
      }
    } catch (error) {
      message.error('Lỗi hệ thống');
    }
  };

  const openEditModal = (record: Company) => {
    setEditingCompany(record);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingCompany(null); 
    setIsModalOpen(true);
  };

  // --- CẤU HÌNH CỘT CHO PC ---
  const columns: ColumnsType<Company> = [
    {
        title: 'Thông tin Nhà xe',
        dataIndex: 'name',
        key: 'name',
        width: 280,
        render: (text, record) => (
          <Space>
            <Avatar shape="square" size={48} icon={<ShopOutlined />} className="bg-blue-100 text-blue-600"/>
            <div className="flex flex-col">
              <Text strong className="text-base">{text}</Text>
              <Text type="secondary" className="text-xs">Mã: {record._id.slice(-6)}</Text>
            </div>
          </Space>
        ),
      },
      {
        title: 'Liên hệ',
        key: 'contact',
        width: 300,
        render: (_, record) => (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
               <PhoneOutlined className="text-green-600"/> 
               <Text copyable>{record.hotline}</Text>
            </div>
            {record.email && (
              <div className="flex items-center gap-2 text-gray-500">
                 <MailOutlined /> {record.email}
              </div>
            )}
            {record.address && (
              <div className="flex items-center gap-2 text-gray-500 truncate max-w-[250px]" title={record.address}>
                  <EnvironmentOutlined /> {record.address}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Hành động',
        key: 'action',
        fixed: 'right',
        width: 100,
        render: (_, record) => (
          <Space>
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              type="text"
              className="text-blue-600 hover:bg-blue-50"
              onClick={() => openEditModal(record)} 
            />
            <Popconfirm title="Xóa?" onConfirm={() => handleDelete(record._id)}>
              <Button icon={<DeleteOutlined />} size="small" type="text" danger />
            </Popconfirm>
          </Space>
        ),
      },
  ];

  // --- RENDER MOBILE ITEM ---
  const renderMobileItem = (item: Company) => (
    <Card 
      size="small"
      title={
        <Space>
           <Avatar shape="square" size="small" icon={<ShopOutlined />} className="bg-blue-100 text-blue-600"/>
           <span className="font-bold text-gray-800">{item.name}</span>
        </Space>
      }
      className="border border-gray-200 shadow-sm"
      actions={[
         <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEditModal(item)}>Sửa</Button>,
         <Popconfirm key="del" title="Xóa?" onConfirm={() => handleDelete(item._id)}>
             <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
         </Popconfirm>
      ]}
    >
       <div className="flex flex-col gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
             <PhoneOutlined className="text-green-600"/> 
             <a href={`tel:${item.hotline}`} className="text-gray-800 font-medium">{item.hotline}</a>
          </div>
          {item.email && (
             <div className="flex items-center gap-2">
                <MailOutlined /> 
                <span>{item.email}</span>
             </div>
          )}
          {item.address && (
             <div className="flex items-start gap-2">
                <EnvironmentOutlined className="mt-1"/> 
                <span>{item.address}</span>
             </div>
          )}
       </div>
    </Card>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <DataTable
        title={<span className="text-xl font-bold text-gray-800">Quản lý Nhà xe</span>}
        columns={columns}
        dataSource={companies}
        loading={loading}
        onReload={fetchData} 
        onAdd={openCreateModal}
        searchPlaceholder="Tìm tên, hotline, email..."
        searchFields={['name', 'hotline', 'email']}
        renderMobileItem={renderMobileItem} // <-- TRUYỀN HÀM RENDER MOBILE
      />

      <CompanyModal
        open={isModalOpen}
        loading={submitting}
        initialValues={editingCompany}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isLoggedIn={true} 
      />
    </div>
  );
}