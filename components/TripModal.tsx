'use client';

import { Modal, Form, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import TripBaseForm from './TripBaseForm';

export default function TripModal({
  open,
  loading,
  initialValues, // Dữ liệu từ API GET (JSON bạn gửi)
  onCancel,
  onSubmit,
  data
}: any) {
 const [form] = Form.useForm();

useEffect(() => {
  if (open) {
    if (initialValues) {
      console.log("Dữ liệu gốc từ API:", initialValues); // Debug xem có dữ liệu không

      // 1. Xử lý ID: Lấy _id ra khỏi object (nếu có populate)
      // Cú pháp `?.` giúp code không chết nếu null
      const companyId = initialValues.companyId?._id || initialValues.companyId;
      const routeId = initialValues.routeId?._id || initialValues.routeId;
      const busId = initialValues.busId?._id || initialValues.busId;
      const driverId = initialValues.driverId?._id || initialValues.driverId;

      const departureTime = initialValues.departureTime ? dayjs(initialValues.departureTime) : null;
      const arrivalTime = initialValues.arrivalTime ? dayjs(initialValues.arrivalTime) : null;

      const formatPoints = (points: any[]) => {
        if (!Array.isArray(points)) return [];
        return points.map(p => ({
          ...p,
          defaultSurcharge: p.surcharge ?? p.defaultSurcharge ?? 0, // Quan trọng
          timeOffset: p.timeOffset || 0
        }));
      };

      // 4. Đẩy dữ liệu đã chuẩn hóa vào Form
      form.setFieldsValue({
        ...initialValues, // Spread các trường cơ bản (như basePrice)
        companyId,        // Ghi đè ID đã xử lý
        routeId,
        busId,
        driverId,
        departureTime,    // Ghi đè Date đã xử lý
        arrivalTime,
        pickupPoints: formatPoints(initialValues.pickupPoints),
        dropoffPoints: formatPoints(initialValues.dropoffPoints),
      });

    } else {
      // Trường hợp tạo mới -> Reset form
      form.resetFields();
    }
  }
}, [open, initialValues, form]);

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      departureTime: values.departureTime ? values.departureTime.toISOString() : null,
      arrivalTime: values.arrivalTime ? values.arrivalTime.toISOString() : null
    };
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      title={initialValues ? 'Cập nhật chuyến đi' : 'Tạo chuyến đi'}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={900}
      destroyOnClose={false}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name="departureTime" 
            label="Giờ khởi hành" 
            rules={[{ required: true, message: 'Chọn giờ đi' }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>

          <Form.Item 
            name="arrivalTime" 
            label="Giờ đến dự kiến" 
            rules={[{ required: true, message: 'Chọn giờ đến' }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>
        </div>

        <TripBaseForm data={data} />
      </Form>
    </Modal>
  );
}