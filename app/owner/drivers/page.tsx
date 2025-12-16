'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Modal, Form, Input, Select, // Thêm Select
  Tag, message, Space, Popconfirm, Avatar, Row, Col, Switch 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  UserOutlined, PhoneOutlined, IdcardOutlined, LockOutlined, ShopOutlined 
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable';

interface Driver {
  id: string; 
  _id: string;
  name: string;
  email: string;
  phone: string;
  driverLicense?: string;
  companyId?: { _id: string; name: string }; 
  isActive: boolean;
  createdAt: string;
}

export default function OwnerDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  // State lưu danh sách công ty để chọn
  const [companies, setCompanies] = useState<{label: string, value: string}[]>([]); 
  
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form] = Form.useForm();

  // 1. Fetch Dữ liệu (Drivers + Companies)
  const fetchData = async () => {
    setLoading(true);
    try {
      // Gọi song song 2 API
      const [resDrivers, resCompanies] = await Promise.all([
        fetch('/api/owner/drivers'),
        fetch('/api/owner/companies')
      ]);

      const dataDrivers = await resDrivers.json();
      const dataCompanies = await resCompanies.json();

      if (dataDrivers.success) {
        setDrivers(dataDrivers.data.map((item: any) => ({ ...item, id: item._id })));
      }

      if (dataCompanies.success) {
        // Map dữ liệu công ty thành format cho Select của Antd
        const options = dataCompanies.data.map((c: any) => ({
            label: c.name,
            value: c._id
        }));
        setCompanies(options);
      }

    } catch (error) {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 2. Mở Modal (Xử lý fill dữ liệu companyId)
  const openModal = (record?: Driver) => {
    if (record) {
        setEditingDriver(record);
        form.setFieldsValue({
            ...record,
            // Nếu record có companyId object -> lấy _id để binding vào Select
            companyId: record.companyId?._id 
        });
    } else {
        setEditingDriver(null);
        form.resetFields();
        // Nếu chỉ có 1 công ty, tự chọn luôn cho tiện
        if (companies.length === 1) {
            form.setFieldValue('companyId', companies[0].value);
        }
    }
    setIsModalOpen(true);
  };

  // 3. Submit Form
  const handleSubmit = async (values: any) => {
    try {
      const url = editingDriver 
        ? `/api/owner/drivers/${editingDriver._id}` 
        : '/api/owner/drivers';
      const method = editingDriver ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (res.ok) {
        message.success(editingDriver ? 'Cập nhật thành công' : 'Thêm tài xế thành công');
        setIsModalOpen(false);
        form.resetFields();
        setEditingDriver(null);
        fetchData(); // Reload lại danh sách
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Lỗi kết nối');
    }
  };

  // 4. Xóa
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/drivers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('Đã xóa tài xế');
        fetchData();
      } else {
        message.error('Không thể xóa');
      }
    } catch { message.error('Lỗi hệ thống'); }
  };

  // 5. Cột bảng
  const columns: ColumnsType<Driver> = [
    {
      title: 'Tài xế',
      key: 'info',
      render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} className="bg-blue-500" />
          <div>
            <div className="font-bold">{r.name}</div>
            <div className="text-xs text-gray-500">{r.email}</div>
          </div>
        </Space>
      )
    },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Thuộc Nhà xe',
      dataIndex: 'companyId',
      key: 'company',
      render: (comp: any) => comp?.name ? <Tag color="purple">{comp.name}</Tag> : <Tag>Chưa gán</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      render: (active) => active ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Đã khóa</Tag>
    },
    {
      title: 'Hành động',
      render: (_, r) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openModal(r)} />
          <Popconfirm title="Xóa?" onConfirm={() => handleDelete(r._id)}>
             <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <DataTable
        title="Danh sách Tài xế"
        columns={columns}
        dataSource={drivers}
        loading={loading}
        onReload={fetchData}
        onAdd={() => openModal()}
        searchFields={['name', 'phone']}
      />

      <Modal
        title={editingDriver ? "Cập nhật Tài xế" : "Thêm Tài xế mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
           <Row gutter={16}>
              {/* === THÊM SELECT COMPANY VÀO ĐÂY === */}
              <Col span={24}>
                 <Form.Item 
                    name="companyId" 
                    label="Thuộc Nhà xe / Chi nhánh" 
                    rules={[{ required: true, message: 'Vui lòng chọn nhà xe' }]}
                 >
                    <Select 
                        placeholder="Chọn nhà xe quản lý" 
                        options={companies} 
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                 </Form.Item>
              </Col>
              {/* =================================== */}

              <Col xs={24} md={12}>
                 <Form.Item name="name" label="Họ và tên" rules={[{ required: true }]}>
                    <Input prefix={<UserOutlined />} />
                 </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                 <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true }]}>
                    <Input prefix={<PhoneOutlined />} />
                 </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                 <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true, type: 'email' }]}>
                    <Input disabled={!!editingDriver} />
                 </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                 <Form.Item name="password" label="Mật khẩu" rules={[{ required: !editingDriver }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder={editingDriver ? "Nhập để đổi MK mới" : ""} />
                 </Form.Item>
              </Col>
              <Col span={24}>
                 <Form.Item name="driverLicense" label="Số bằng lái">
                    <Input prefix={<IdcardOutlined />} />
                 </Form.Item>
              </Col>
              <Col span={24}>
                 <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
                    <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
                 </Form.Item>
              </Col>
           </Row>
        </Form>
      </Modal>
    </div>
  );
}