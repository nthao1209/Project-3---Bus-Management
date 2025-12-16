'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Select, DatePicker, InputNumber, Row, Col } from 'antd';
import dayjs from 'dayjs';

interface SelectOption {
  label: string;
  value: string;
}

interface TripModalProps {
  open: boolean;
  loading?: boolean;
  initialValues?: any;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  data: {
    companies: SelectOption[];
    routes: SelectOption[];
    buses: SelectOption[];
    drivers: SelectOption[];
  };
}

export default function TripModal({
  open,
  loading = false,
  initialValues,
  onCancel,
  onSubmit,
  data
}: TripModalProps) {
  const [form] = Form.useForm();

  // --- DEBUG: Kiểm tra xem dữ liệu dropdown có truyền vào không ---
  // Mở F12 (Console) lên xem khi mở Modal
  useEffect(() => {
    if (open) {
      console.log("Dữ liệu Dropdown nhận được:", data);
      console.log("Dữ liệu chuyến đi cần sửa (initialValues):", initialValues);
    }
  }, [open, data, initialValues]);

  // --- SỬA LẠI USE EFFECT ---
  useEffect(() => {
    if (open) {
      if (initialValues) {
        // TRƯỜNG HỢP SỬA (EDIT)
        // Phải tách lấy _id từ object (populate)
        
        // Helper function để lấy ID an toàn
        const getId = (item: any) => (item && typeof item === 'object' && item._id) ? item._id : item;

        form.setFieldsValue({
          ...initialValues,
          // Xử lý các trường Select
          companyId: getId(initialValues.companyId),
          routeId: getId(initialValues.routeId),
          busId: getId(initialValues.busId),
          driverId: getId(initialValues.driverId),
          
          // Xử lý ngày tháng
          departureTime: initialValues.departureTime ? dayjs(initialValues.departureTime) : null,
          arrivalTime: initialValues.arrivalTime ? dayjs(initialValues.arrivalTime) : null,
        });
      } else {
        // TRƯỜNG HỢP THÊM MỚI (ADD)
        form.resetFields();
        // Tự chọn company nếu chỉ có 1
        if (data.companies?.length === 1) {
            form.setFieldValue('companyId', data.companies[0].value);
        }
      }
    }
  }, [open, initialValues, form, data]); // Thêm data vào dependency

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      departureTime: values.departureTime?.toISOString(),
      arrivalTime: values.arrivalTime?.toISOString(),
    };
    onSubmit(payload);
  };

  return (
    <Modal
      title={initialValues ? "Cập nhật Chuyến đi" : "Lên lịch Chuyến mới"}
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={form.submit}
      confirmLoading={loading}
      width={700}
      okText="Lưu lại"
      cancelText="Hủy bỏ"
      destroyOnClose // Quan trọng: Hủy modal khi đóng để reset state form
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item 
                name="companyId" 
                label="Nhà xe" 
                rules={[{ required: true, message: 'Vui lòng chọn nhà xe' }]}
            >
              <Select 
                options={data.companies} 
                placeholder="Chọn nhà xe" 
                allowClear
                // Thêm cái này để debug nếu options bị rỗng
                notFoundContent={data.companies.length === 0 ? "Chưa có dữ liệu công ty" : null}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="routeId" label="Tuyến đường" rules={[{ required: true, message: 'Chọn tuyến' }]}>
              <Select 
                options={data.routes} 
                placeholder="Chọn tuyến đường" 
                showSearch 
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} 
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="busId" label="Chọn xe" rules={[{ required: true, message: 'Chọn xe' }]}>
              <Select 
                options={data.buses} 
                placeholder="Chọn xe" 
                showSearch 
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} 
              />
            </Form.Item>
          </Col>

          {/* ... Các trường DatePicker giữ nguyên ... */}
          <Col xs={24} md={12}>
            <Form.Item name="departureTime" label="Giờ khởi hành" rules={[{ required: true }]}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="arrivalTime" label="Giờ dự kiến đến" rules={[{ required: true }]}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="driverId" label="Tài xế phụ trách">
              <Select options={data.drivers} placeholder="Chọn tài xế" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="basePrice" label="Giá vé cơ bản" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} addonAfter="VND" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
            </Form.Item>
          </Col>
          
          {initialValues && (
            <Col span={24}>
              <Form.Item name="status" label="Trạng thái">
                <Select>
                  <Select.Option value="scheduled">Đã lên lịch</Select.Option>
                  <Select.Option value="running">Đang chạy</Select.Option>
                  <Select.Option value="completed">Đã hoàn thành</Select.Option>
                  <Select.Option value="cancelled">Hủy chuyến</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Modal>
  );
}