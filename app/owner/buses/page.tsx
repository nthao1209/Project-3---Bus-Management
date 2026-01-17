'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Modal, Form, Input, Select, 
  InputNumber, Tag, message, Space, Popconfirm, Tooltip, Card 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  CarOutlined, ShopOutlined, UsergroupAddOutlined, AppstoreOutlined 
} from '@ant-design/icons';
import DataTable from '@/components/DataTable';

interface Bus {
  _id: string;
  plateNumber: string;
  type: string;
  companyId: { _id: string; name: string } | string;
  seatLayout: {
    totalSeats: number;
    totalFloors: number;
    schema: string[][]; 
  };
  amenities: string[];
  status: 'active' | 'maintenance';
}

const AMENITIES_OPTIONS = [
  { label: 'Wifi', value: 'Wifi' },
  { label: 'Điều hòa', value: 'AC' },
  { label: 'Nước uống', value: 'Water' },
  { label: 'Cổng USB', value: 'USB' },
  { label: 'Gối/Chăn', value: 'Blanket' },
  { label: 'Nhà vệ sinh', value: 'WC' },
  { label: 'Màn hình TV', value: 'TV' },
];

const BUS_TYPES = [
  'Giường nằm 40 chỗ',
  'Limousine 34 phòng',
  'Limousine 22 phòng',
  'Ghế ngồi 29 chỗ',
  'Ghế ngồi 45 chỗ',
  'Cung điện di động',
];

const generateDefaultSchema = (totalSeats: number) => {
  const schema: string[][] = [];
  let currentRow: string[] = [];
  const seatsPerRow = 4; 

  for (let i = 1; i <= totalSeats; i++) {
    const seatCode = i < 10 ? `0${i}` : `${i}`;
    currentRow.push(seatCode);

    if (currentRow.length === seatsPerRow || i === totalSeats) {
      schema.push(currentRow);
      currentRow = [];
    }
  }
  return schema;
};

export default function BusManagementPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [companies, setCompanies] = useState<{label: string, value: string}[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resBuses, resCompanies] = await Promise.all([
        fetch('/api/owner/buses'),
        fetch('/api/owner/companies')
      ]);
      
      const dataBuses = await resBuses.json();
      const dataCompanies = await resCompanies.json();

      if (dataBuses.success) setBuses(dataBuses.data);
      
      if (dataCompanies.success) {
        const comps = Array.isArray(dataCompanies.data) 
            ? dataCompanies.data 
            : [dataCompanies.data];
        setCompanies(comps.map((c: any) => ({ label: c.name, value: c._id })));
      }
    } catch (error) {
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (values: any) => {
    try {
      const totalSeats = values.totalSeats;
      const generatedSchema = generateDefaultSchema(totalSeats);

      const payload = {
        ...values,
        seatLayout: {
          totalSeats: totalSeats,
          totalFloors: values.totalFloors || 1,
          schema: generatedSchema 
        }
      };

      const url = editingBus ? `/api/owner/buses/${editingBus._id}` : '/api/owner/buses';
      const method = editingBus ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok) {
        message.success(editingBus ? 'Cập nhật xe thành công' : 'Thêm xe mới thành công');
        setIsModalOpen(false);
        form.resetFields();
        setEditingBus(null);
        fetchData();
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Lỗi kết nối');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/owner/buses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        message.success('Đã xóa xe');
        fetchData();
      } else {
        message.error('Không thể xóa xe này');
      }
    } catch (error) {
      message.error('Lỗi hệ thống');
    }
  };

  const openEditModal = (record: Bus) => {
    setEditingBus(record);
    form.setFieldsValue({
      companyId: typeof record.companyId === 'object' ? record.companyId._id : record.companyId,
      plateNumber: record.plateNumber,
      type: record.type,
      totalSeats: record.seatLayout?.totalSeats,
      totalFloors: record.seatLayout?.totalFloors,
      amenities: record.amenities,
      status: record.status
    });
    setIsModalOpen(true);
  };

  // --- CẤU HÌNH CỘT CHO PC ---
  const columns = [
    {
      title: 'Biển số',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
      render: (text: string) => <Tag color="geekblue" className="font-bold">{text}</Tag>
    },
    {
      title: 'Nhà xe',
      dataIndex: 'companyId',
      key: 'companyId',
      render: (company: any) => <span className="text-gray-700">{company?.name || '---'}</span>
    },
    {
      title: 'Loại xe',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Sơ đồ',
      dataIndex: 'seatLayout',
      key: 'seatLayout',
      render: (layout: any) => (
        <div className="text-xs">
           <div>Active: {layout?.totalSeats} ghế</div>
           <div className="text-gray-400">
             {layout?.schema?.length > 0 ? '(Đã có sơ đồ)' : '(Chưa có sơ đồ)'}
           </div>
        </div>
      )
    },
    {
      title: 'Tiện ích',
      dataIndex: 'amenities',
      key: 'amenities',
      render: (items: string[]) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {items?.map((item, idx) => (
            <Tag key={idx} className="text-[10px] m-0">{item}</Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        status === 'active' 
          ? <Tag color="green">Hoạt động</Tag> 
          : <Tag color="red">Bảo trì</Tag>
      )
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: Bus) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button icon={<EditOutlined />} size="small" onClick={() => openEditModal(record)} />
          </Tooltip>
          <Popconfirm title="Xóa xe này?" onConfirm={() => handleDelete(record._id)} okText="Xóa" cancelText="Hủy">
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // --- RENDER MOBILE ITEM ---
  const renderMobileItem = (item: Bus) => (
    <Card 
      size="small"
      title={<span className="font-bold text-blue-700">{item.plateNumber}</span>}
      extra={item.status === 'active' ? <Tag color="green">Hoạt động</Tag> : <Tag color="red">Bảo trì</Tag>}
      className="border border-gray-200 shadow-sm"
      actions={[
         <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => openEditModal(item)}>Sửa</Button>,
         <Popconfirm key="del" title="Xóa?" onConfirm={() => handleDelete(item._id)}>
             <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
         </Popconfirm>
      ]}
    >
       <div className="flex flex-col gap-2 text-gray-600">
          <div className="flex items-center gap-2">
             <ShopOutlined /> 
             <span className="font-medium">{(item.companyId as any)?.name || '---'}</span>
          </div>
          <div className="flex items-center gap-2">
             <CarOutlined /> 
             <span>{item.type}</span>
          </div>
          <div className="flex items-center gap-2">
             <UsergroupAddOutlined /> 
             <span>{item.seatLayout?.totalSeats} ghế ({item.seatLayout?.totalFloors} tầng)</span>
          </div>
          <div className="flex items-start gap-2">
             <AppstoreOutlined className="mt-1" />
             <div className="flex flex-wrap gap-1">
                {item.amenities?.length > 0 
                  ? item.amenities.map((a, idx) => <Tag key={idx} className="text-[10px] m-0">{a}</Tag>)
                  : <span className="text-gray-400 italic text-xs">Không có tiện ích</span>
                }
             </div>
          </div>
       </div>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Quản lý Đội xe</h2>
           <p className="text-gray-500 text-sm">Quản lý danh sách xe và cấu hình ghế</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          className="w-full md:w-auto"
          onClick={() => {
            setEditingBus(null);
            form.resetFields();
            if (companies.length === 1) {
                form.setFieldValue('companyId', companies[0].value);
            }
            setIsModalOpen(true);
          }}
        >
          Thêm xe mới
        </Button>
      </div>

      <DataTable
        title={null}
        columns={columns}
        dataSource={buses}
        loading={loading}
        searchFields={['plateNumber', 'type']}
        searchPlaceholder="Tìm biển số..."
        pagination={{ pageSize: 10 }}
        renderMobileItem={renderMobileItem} // <-- TRUYỀN HÀM RENDER MOBILE
      />

      <Modal
        title={
            <div className="flex items-center gap-2">
                <CarOutlined /> 
                {editingBus ? `Cập nhật xe: ${editingBus.plateNumber}` : "Thêm phương tiện mới"}
            </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        width={700}
        okText={editingBus ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        centered
      >
        <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSubmit}
            initialValues={{ 
                status: 'active',
                totalFloors: 1,
                totalSeats: 40
            }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Form.Item 
                    name="companyId" 
                    label="Nhà xe" 
                    rules={[{ required: true, message: 'Vui lòng chọn nhà xe' }]}
                >
                    <Select options={companies} placeholder="Chọn nhà xe" />
                </Form.Item>

                <Form.Item 
                    name="plateNumber" 
                    label="Biển số" 
                    rules={[{ required: true, message: 'Nhập biển số' }]}
                >
                    <Input placeholder="Vd: 29B-123.45" style={{ textTransform: 'uppercase' }} />
                </Form.Item>

                <div className="flex gap-4">
                    <Form.Item 
                        name="totalSeats" 
                        label="Số ghế" 
                        className="w-full"
                        rules={[{ required: true, message: 'Nhập số ghế' }]}
                    >
                        <InputNumber min={4} max={60} className="w-full" />
                    </Form.Item>
                    <Form.Item 
                        name="totalFloors" 
                        label="Số tầng" 
                        className="w-full"
                    >
                        <InputNumber min={1} max={2} className="w-full" />
                    </Form.Item>
                </div>
            </div>

            <div>
                <Form.Item 
                    name="type" 
                    label="Loại xe" 
                    rules={[{ required: true, message: 'Chọn loại xe' }]}
                >
                    <Select 
                        showSearch 
                        placeholder="Chọn loại xe"
                        options={BUS_TYPES.map(t => ({ label: t, value: t }))}
                    />
                </Form.Item>

                <Form.Item name="status" label="Trạng thái">
                    <Select>
                        <Select.Option value="active">Đang hoạt động</Select.Option>
                        <Select.Option value="maintenance">Bảo trì</Select.Option>
                    </Select>
                </Form.Item>
                
                <Form.Item name="amenities" label="Tiện ích">
                  <Select 
                      mode="multiple" 
                      placeholder="Chọn tiện ích"
                      options={AMENITIES_OPTIONS}
                      maxTagCount="responsive"
                  />
                </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}