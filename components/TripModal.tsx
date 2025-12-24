'use client';

import { Modal, Form, DatePicker } from 'antd';
import dayjs from 'dayjs';
import TripBaseForm from './TripBaseForm';

export default function TripModal({
  open,
  loading,
  initialValues,
  onCancel,
  onSubmit,
  data
}: any) {
  const [form] = Form.useForm();

  const handleFinish = (values: any) => {
    onSubmit({
      ...values,
      departureTime: values.departureTime.toISOString(),
      arrivalTime: values.arrivalTime.toISOString()
    });
  };

  return (
    <Modal
      open={open}
      title={initialValues ? 'Cập nhật chuyến đi' : 'Tạo chuyến đi'}
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
        initialValues={
          initialValues && {
            ...initialValues,
            departureTime: dayjs(initialValues.departureTime),
            arrivalTime: dayjs(initialValues.arrivalTime)
          }
        }
      >
        <Form.Item name="departureTime" label="Giờ khởi hành" rules={[{ required: true }]}>
          <DatePicker showTime className="w-full" />
        </Form.Item>

        <Form.Item name="arrivalTime" label="Giờ đến" rules={[{ required: true }]}>
          <DatePicker showTime className="w-full" />
        </Form.Item>

        <TripBaseForm data={data} />
      </Form>
    </Modal>
  );
}
