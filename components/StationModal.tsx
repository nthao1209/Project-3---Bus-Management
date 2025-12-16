'use client';

import { Modal, Form, Input, Select } from 'antd';
import { CompassOutlined } from '@ant-design/icons';
import SelectProvince from '@/components/SeclectProvince';

interface StationModalProps {
  open: boolean;
  loading?: boolean;
  initialValues?: any;
  onCancel: () => void;
  onSubmit: (values: any) => void;
}

export default function StationModal({
  open,
  loading = false,
  initialValues,
  onCancel,
  onSubmit
}: StationModalProps) {
  const [form] = Form.useForm();

  const handleFinish = (values: any) => {
    const fullAddress = `${values.addressDetail}, ${values.ward}, ${values.district}`;
    const payload = {
        name: values.name,
        province: values.province,
        address: fullAddress, 
        type: values.type
    };
    console.log(form.getFieldsValue());
    onSubmit(payload);
  };


  return (
    <Modal
      title={initialValues ? 'Cập nhật bến xe' : 'Thêm bến xe mới'}
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={form.submit}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
      >
        <Form.Item
          name="name"
          label="Tên địa điểm"
          rules={[{ required: true }]}
        >
          <Input
            prefix={<CompassOutlined />}
            placeholder="Vd: Bến xe Mỹ Đình"
          />
        </Form.Item>
          <SelectProvince />
        <Form.Item
          name="type"
          label="Loại địa điểm"
          initialValue="bus_station"
        >
          <Select>
            <Select.Option value="bus_station">Bến xe khách</Select.Option>
            <Select.Option value="office">Văn phòng nhà xe</Select.Option>
            <Select.Option value="rest_stop">Trạm dừng nghỉ</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
