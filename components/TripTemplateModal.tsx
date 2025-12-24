'use client';

import { Modal, Form, Input, InputNumber, Checkbox, TimePicker } from 'antd';
import TripBaseForm from './TripBaseForm';
import dayjs from 'dayjs';
import { useEffect } from 'react';

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
    if (!open) return;

    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        departureTimeStr: dayjs(initialValues.departureTimeStr, 'HH:mm'),
      });
    } else {
      form.resetFields();
    }
  }, [open, initialValues]);
  const handleFinish = (values: any) => {
  const payload = {
    ...values,
    departureTimeStr: values.departureTimeStr.format('HH:mm'),
  };

  onSubmit(payload);
};

  return (
    <Modal
      open={open}
      title={initialValues ? 'Cập nhật mẫu lịch' : 'Tạo mẫu lịch chạy'}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
       <Form.Item
        name="departureTimeStr"
        label="Giờ chạy cố định"
        rules={[{ required: true, message: 'Vui lòng chọn giờ chạy' }]}
      >
        <TimePicker
          format="HH:mm"
          className="w-full"
          minuteStep={5}
          placeholder="Chọn giờ"
        />
      </Form.Item>

        <Form.Item
          name="durationMinutes"
          label="Thời gian di chuyển (phút)"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} className="w-full" />
        </Form.Item>

        <Form.Item
          name="daysOfWeek"
          label="Ngày chạy"
          rules={[{ required: true }]}
        >
          <Checkbox.Group
            options={[
              { label: 'CN', value: 0 },
              { label: 'T2', value: 1 },
              { label: 'T3', value: 2 },
              { label: 'T4', value: 3 },
              { label: 'T5', value: 4 },
              { label: 'T6', value: 5 },
              { label: 'T7', value: 6 }
            ]}
          />
        </Form.Item>

        <TripBaseForm data={data} />
      </Form>
    </Modal>
  );
}
