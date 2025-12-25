'use client';

import { Modal, Form, InputNumber, Checkbox, TimePicker, Row, Col } from 'antd';
import TripBaseForm from './TripBaseForm';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useEffect } from 'react';

dayjs.extend(customParseFormat);

export default function TripTemplateModal({
  open,
  loading,
  initialValues,
  onCancel,
  onSubmit,
  data
}: any) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          departureTimeStr: initialValues.departureTimeStr 
            ? dayjs(initialValues.departureTimeStr, 'HH:mm') 
            : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          active: true,
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // Mặc định chạy cả tuần
        });
      }
    }
  }, [open, initialValues, form]);

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      // Convert dayjs object về chuỗi "HH:mm" cho backend
      departureTimeStr: values.departureTimeStr 
        ? values.departureTimeStr.format('HH:mm') 
        : null,
    };
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      title={initialValues ? 'Cập nhật lịch mẫu' : 'Tạo lịch chạy mẫu'}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={900}
      destroyOnClose
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="departureTimeStr"
              label="Giờ xuất bến cố định"
              rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}
            >
              <TimePicker
                format="HH:mm"
                className="w-full"
                minuteStep={5}
                placeholder="Chọn giờ (VD: 07:30)"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="durationMinutes"
              label="Thời gian di chuyển (phút)"
              rules={[{ required: true, message: 'Nhập thời gian chạy' }]}
            >
              <InputNumber min={1} className="w-full" placeholder="VD: 120" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="daysOfWeek"
          label="Ngày chạy trong tuần"
          rules={[{ required: true, message: 'Chọn ít nhất 1 ngày' }]}
        >
          <Checkbox.Group
            className="w-full grid grid-cols-7 gap-2"
            options={[
              { label: 'Thứ 2', value: 1 },
              { label: 'Thứ 3', value: 2 },
              { label: 'Thứ 4', value: 3 },
              { label: 'Thứ 5', value: 4 },
              { label: 'Thứ 6', value: 5 },
              { label: 'Thứ 7', value: 6 },
              { label: 'Chủ Nhật', value: 0 }
            ]}
          />
        </Form.Item>

        <TripBaseForm data={data} />
      </Form>
    </Modal>
  );
}