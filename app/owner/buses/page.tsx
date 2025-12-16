'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Modal, Form, Input, Select, 
  InputNumber, Tag, message, Space, Popconfirm, Tooltip 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  CarOutlined, WifiOutlined 
} from '@ant-design/icons';
import DataTable from '@/components/DataTable'; // Đảm bảo bạn đã có component này

// Interface dữ liệu Xe
interface Bus {
  _id: string;
  plateNumber: string;
  type: string;
  companyId: { _id: string; name: string } | string;
  seatLayout: {
    totalSeats: number;
    totalFloors: number;
  };
  amenities: string[];
  status: 'active' | 'maintenance';
}

// Danh sách tiện ích mẫu
const AMENITIES_OPTIONS = [
  { label: 'Wifi', value: 'Wifi' },
  { label: 'Điều hòa', value: 'AC' },
  { label: 'Nước uống', value: 'Water' },
  { label: 'Cổng USB', value: 'USB' },
  { label: 'Gối/Chăn', value: 'Blanket' },
  { label: 'Nhà vệ sinh', value: 'WC' },
  { label: 'Màn hình TV', value: 'TV' },
];

// Danh sách loại xe mẫu
const BUS_TYPES = [
  'Giường nằm 40 chỗ',
  'Limousine 34 phòng',
  'Limousine 22 phòng',
  'Ghế ngồi 29 chỗ',
  'Ghế ngồi 45 chỗ',
  'Cung điện di động',
];

export default function BusManagementPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [companies, setCompanies] = useState<{label: string, value: string}[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [form] = Form.useForm();

  // 1. Fetch dữ liệu Xe và Công ty
  const fetchData = async () => {
    setLoading(true);
    try {
      // Gọi API lấy danh sách xe (API GET bạn cung cấp)
      const resBuses = await fetch('/api/owner/buses');
      const dataBuses = await resBuses.json();

      // Gọi API lấy danh sách công ty (Để đổ vào Dropdown chọn công ty)
      // Giả định bạn đã có API này từ các bước trước (/api/company/me hoặc /api/owner/companies)
      const resCompanies = await fetch('/api/owner/companies'); 
      const dataCompanies = await resCompanies.json();

      if (dataBuses.success) setBuses(dataBuses.data);
      
      // Xử lý dữ liệu công ty cho Select
      if (dataCompanies.success) {
        // API /api/company thường trả về 1 object (nếu /me) hoặc mảng.
        // Logic dưới đây xử lý linh hoạt
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

  // 2. Xử lý Submit (Thêm hoặc Sửa)
  const handleSubmit = async (values: any) => {
    try {
      // Chuẩn bị dữ liệu đúng format schema
      const payload = {
        ...values,
        seatLayout: {
          totalSeats: values.totalSeats,
          totalFloors: values.totalFloors || 1,
          schema: {} // Mặc định schema rỗng, sẽ làm chức năng vẽ sơ đồ sau
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
        fetchData(); // Reload lại bảng
      } else {
        message.error(json.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Lỗi kết nối');
    }
  };

  // 3. Xử lý Xóa
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

  // 4. Mở Modal Sửa
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

  // 5. Cấu hình Cột Bảng
  const columns = [
    {
      title: 'Biển số',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
      render: (text: string) => <Tag color="geekblue" className="font-bold text-sm">{text}</Tag>
    },
    {
      title: 'Nhà xe',
      dataIndex: 'companyId',
      key: 'companyId',
      render: (company: any) => <span className="font-semibold text-gray-700">{company?.name || '---'}</span>
    },
    {
      title: 'Loại xe',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Số ghế',
      dataIndex: ['seatLayout', 'totalSeats'],
      key: 'totalSeats',
      render: (seats: number) => <span className="font-medium">{seats} ghế</span>
    },
    {
      title: 'Tiện ích',
      dataIndex: 'amenities',
      key: 'amenities',
      render: (items: string[]) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {items?.map((item, idx) => (
            <Tag key={idx} className="text-[10px] m-0 bg-gray-100 border-gray-300">{item}</Tag>
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
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: Bus) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => openEditModal(record)} 
            />
          </Tooltip>
          <Popconfirm 
            title="Xóa xe này?" 
            description="Hành động này không thể hoàn tác"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Quản lý Đội xe</h2>
           <p className="text-gray-500 text-sm">Quản lý danh sách xe, biển số và tiện ích</p>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => {
            setEditingBus(null);
            form.resetFields();
            // Nếu chỉ có 1 công ty, tự động chọn luôn
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
        searchPlaceholder="Tìm theo biển số hoặc loại xe..."
        pagination={{ pageSize: 10 }}
      />

      {/* Modal Form */}
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
        cancelText="Hủy bỏ"
      >
        <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSubmit}
            initialValues={{ 
                status: 'active',
                totalFloors: 1 
            }}
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Cột 1 */}
            <div>
                <Form.Item 
                    name="companyId" 
                    label="Thuộc Nhà xe" 
                    rules={[{ required: true, message: 'Vui lòng chọn nhà xe' }]}
                >
                    <Select options={companies} placeholder="Chọn nhà xe quản lý" />
                </Form.Item>

                <Form.Item 
                    name="plateNumber" 
                    label="Biển số xe" 
                    rules={[{ required: true, message: 'Nhập biển số xe' }]}
                >
                    <Input placeholder="Vd: 29B-123.45" style={{ textTransform: 'uppercase' }} />
                </Form.Item>

                <div className="flex gap-4">
                    <Form.Item 
                        name="totalSeats" 
                        label="Tổng số ghế" 
                        className="w-full"
                        rules={[{ required: true, message: 'Nhập số ghế' }]}
                    >
                        <InputNumber min={4} max={60} className="w-full" placeholder="Vd: 40" />
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

            {/* Cột 2 */}
            <div>
                <Form.Item 
                    name="type" 
                    label="Loại xe" 
                    rules={[{ required: true, message: 'Chọn loại xe' }]}
                >
                    <Select 
                        showSearch 
                        placeholder="Chọn hoặc nhập loại xe"
                        options={BUS_TYPES.map(t => ({ label: t, value: t }))}
                    />
                </Form.Item>

                <Form.Item name="status" label="Trạng thái hoạt động">
                    <Select>
                        <Select.Option value="active">Active (Đang hoạt động)</Select.Option>
                        <Select.Option value="maintenance">Maintenance (Bảo trì)</Select.Option>
                    </Select>
                </Form.Item>
            </div>
          </div>

          <Form.Item name="amenities" label="Tiện ích trên xe">
            <Select 
                mode="multiple" 
                placeholder="Chọn các tiện ích"
                options={AMENITIES_OPTIONS}
                suffixIcon={<WifiOutlined />}
            />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
}