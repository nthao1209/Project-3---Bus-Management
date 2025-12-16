'use client';

import React, { useState, useEffect } from 'react';
import { 
  Button, Modal, Form, Select, TimePicker, 
  InputNumber, Checkbox, message, Space, Popconfirm, Tag, Row, Col 
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  ClockCircleOutlined, CalendarOutlined, CarOutlined, UserOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import DataTable from '@/components/DataTable';
import dayjs from 'dayjs';

interface TripTemplate {
  id: string;
  _id: string;
  name: string;
  // Cấu trúc populate từ API
  routeId?: { _id: string; name: string }; 
  busId?: { _id: string; plateNumber: string; type: string };
  driverId?: { _id: string; name: string }; // Nếu có populate driver
  departureTimeStr: string;
  daysOfWeek: number[];
  basePrice: number;
  durationMinutes: number;
  active: boolean;
}

const DAYS_OPTIONS = [
  { label: 'CN', value: 0 },
  { label: 'T2', value: 1 },
  { label: 'T3', value: 2 },
  { label: 'T4', value: 3 },
  { label: 'T5', value: 4 },
  { label: 'T6', value: 5 },
  { label: 'T7', value: 6 },
];

export default function TripTemplatesPage() {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingTemplate, setEditingTemplate] = useState<TripTemplate | null>(null);

  // Data dropdown
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  // 1. Fetch dữ liệu
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTemp, resRoutes, resBuses, resDrivers] = await Promise.all([
        fetch('/api/owner/trip-templates'),
        fetch('/api/owner/routes'),
        fetch('/api/owner/buses'),
        fetch('/api/owner/drivers'),
      ]);

      const [dTemp, dRoutes, dBuses, dDrivers] = await Promise.all([
        resTemp.json(), resRoutes.json(), resBuses.json(), resDrivers.json()
      ]);

      if (dTemp.success) {
        // Map _id -> id cho DataTable
        setTemplates(dTemp.data.map((t: any) => ({ ...t, id: t._id })));
      }

      if (dRoutes.success) {
          setRoutes(dRoutes.data.map((r: any) => ({ label: r.name, value: r._id })));
      }
      if (dBuses.success) {
          setBuses(dBuses.data.map((b: any) => ({ label: `${b.plateNumber} (${b.type})`, value: b._id })));
      }
      if (dDrivers.success) {
          setDrivers(dDrivers.data.map((d: any) => ({ label: `${d.name} - ${d.phone}`, value: d._id })));
      }

    } catch (error) {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 2. Submit
  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        departureTimeStr: values.time.format('HH:mm'),
        durationMinutes: values.durationMinutes || 300,
      };

      const url = editingTemplate 
        ? `/api/owner/trip-templates/${editingTemplate._id}` 
        : '/api/owner/trip-templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success(editingTemplate ? 'Cập nhật thành công' : 'Tạo mới thành công');
        setIsModalOpen(false);
        setEditingTemplate(null);
        form.resetFields();
        fetchData(); // Reload lại bảng
      } else {
        const err = await res.json();
        message.error(err.message || 'Lỗi khi lưu');
      }
    } catch { message.error('Lỗi kết nối'); }
  };

  // 3. Xóa
  const handleDelete = async (id: string) => {
    await fetch(`/api/owner/trip-templates/${id}`, { method: 'DELETE' });
    message.success('Đã xóa');
    fetchData();
  };

  // 4. Mở Modal
  const openModal = (record?: TripTemplate) => {
    if (record) {
      setEditingTemplate(record);
      form.setFieldsValue({
        ...record,
        // Quan trọng: Lấy ID từ object populate để binding vào Select
        routeId: record.routeId?._id, 
        busId: record.busId?._id,
        driverId: typeof record.driverId === 'object' ? (record.driverId as any)._id : record.driverId, 
        time: dayjs(record.departureTimeStr, 'HH:mm'),
      });
    } else {
      setEditingTemplate(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  // 5. Cấu hình Cột
  const columns: ColumnsType<TripTemplate> = [
    {
      title: 'Tuyến đường',
      key: 'route',
      // Check null an toàn
      render: (_, r) => <b>{r.routeId?.name || <span className="text-red-400">Tuyến đã xóa</span>}</b>
    },
    {
      title: 'Xe',
      key: 'bus',
      render: (_, r) => r.busId ? <Tag icon={<CarOutlined />} color="blue">{r.busId.plateNumber}</Tag> : <Tag>Xe đã xóa</Tag>
    },
    {
      title: 'Giờ chạy',
      dataIndex: 'departureTimeStr',
      render: (t) => <Tag icon={<ClockCircleOutlined />} color="green" className="text-base font-bold">{t}</Tag>
    },
    {
      title: 'Lịch chạy trong tuần',
      dataIndex: 'daysOfWeek',
      render: (days: number[]) => (
        <Space size={[0, 4]} wrap>
          {DAYS_OPTIONS.map(d => (
            <Tag key={d.value} color={days.includes(d.value) ? 'geekblue' : 'default'}>
              {d.label}
            </Tag>
          ))}
        </Space>
      )
    },
    {
        title: 'Giá vé',
        dataIndex: 'basePrice',
        render: (p) => <span className="font-bold text-green-600">{p?.toLocaleString()}đ</span>
    },
    {
      title: 'Hành động',
      key: 'action',
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
        title="Cấu hình Lịch chạy Cố định"
        columns={columns}
        dataSource={templates}
        loading={loading}
        onReload={fetchData}
        onAdd={() => openModal()}
      />

      <Modal
        title={editingTemplate ? "Cập nhật Lịch trình" : "Thêm Lịch trình Cố định"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={form.submit}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={24}>
               <Form.Item name="routeId" label="Tuyến đường" rules={[{ required: true }]}>
                  <Select 
                    options={routes} 
                    placeholder="Chọn tuyến" 
                    showSearch 
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  />
               </Form.Item>
            </Col>
            <Col xs={24} md={12}>
               <Form.Item name="busId" label="Chọn xe cố định" rules={[{ required: true }]}>
                  <Select options={buses} placeholder="Chọn xe" showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
               </Form.Item>
            </Col>
            <Col xs={24} md={12}>
               <Form.Item name="driverId" label="Tài xế cố định">
                  <Select options={drivers} placeholder="Chọn tài xế" allowClear showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
               </Form.Item>
            </Col>
            {/* ... Các field khác giữ nguyên */}
            <Col xs={24} md={12}>
               <Form.Item name="time" label="Giờ xuất bến" rules={[{ required: true }]}>
                  <TimePicker format="HH:mm" className="w-full" minuteStep={5} />
               </Form.Item>
            </Col>
            <Col xs={24} md={12}>
               <Form.Item name="durationMinutes" label="Thời gian chạy (phút)" initialValue={300} rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} />
               </Form.Item>
            </Col>
            <Col xs={24} md={12}>
               <Form.Item name="basePrice" label="Giá vé mặc định" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} addonAfter="VND" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
               </Form.Item>
            </Col>
            <Col span={24}>
               <Form.Item name="daysOfWeek" label="Chạy vào các ngày" rules={[{ required: true }]}>
                  <Checkbox.Group options={DAYS_OPTIONS} />
               </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}