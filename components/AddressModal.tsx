import { Modal, Form, Select, Input, Row, Col } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

// API CONSTANTS
const PROVINCES_API = 'https://provinces.open-api.vn/api/?depth=1';
const DISTRICTS_API = (code: number) => `https://provinces.open-api.vn/api/p/${code}?depth=2`;
const WARDS_API = (code: number) => `https://provinces.open-api.vn/api/d/${code}?depth=2`;

const removeVietnameseTones = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

interface AddressModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (fullAddress: string) => void;
}

export const AddressModal = ({ visible, onCancel, onOk }: AddressModalProps) => {
  const [form] = Form.useForm();
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [districtCode, setDistrictCode] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      fetch(PROVINCES_API).then(res => res.json()).then(setProvinces);
    }
  }, [visible]);

  const loadDistricts = async (code: number) => {
    const res = await fetch(DISTRICTS_API(code));
    const data = await res.json();
    setDistricts(data.districts || []);
    setWards([]); // Reset wards
    form.setFieldsValue({ district: undefined, ward: undefined });
  };

  const loadWards = async (code: number) => {
    const res = await fetch(WARDS_API(code));
    const data = await res.json();
    setWards(data.wards || []);
    form.setFieldsValue({ ward: undefined });
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      // Gộp địa chỉ thành 1 chuỗi: "Số 1, Xã A, Huyện B, Tỉnh C"
      const fullAddr = `${values.addressDetail}, ${values.ward}, ${values.district}, ${values.province}`;
      onOk(fullAddr);
      form.resetFields();
    });
  };

  return (
    <Modal title="Chọn địa chỉ chi tiết" open={visible} onOk={handleOk} onCancel={onCancel} destroyOnClose>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="province" label="Tỉnh / Thành phố" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Chọn tỉnh"
                filterOption={(input, option) => removeVietnameseTones(option?.label as string).includes(removeVietnameseTones(input))}
                options={provinces.map(p => ({ value: p.code, label: p.name }))}
                onChange={(code, option: any) => {
                    setProvinceCode(code);
                    // Lưu label vào form thay vì code để lúc ghép chuỗi cho dễ
                    form.setFieldValue('province', option.label); 
                    loadDistricts(code);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="district" label="Quận / Huyện" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Chọn quận/huyện"
                disabled={!provinceCode}
                filterOption={(input, option) => removeVietnameseTones(option?.label as string).includes(removeVietnameseTones(input))}
                options={districts.map(d => ({ value: d.code, label: d.name }))}
                onChange={(code, option: any) => {
                    setDistrictCode(code);
                    form.setFieldValue('district', option.label);
                    loadWards(code);
                }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="ward" label="Xã / Phường" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Chọn xã/phường"
                disabled={!districtCode}
                filterOption={(input, option) => removeVietnameseTones(option?.label as string).includes(removeVietnameseTones(input))}
                options={wards.map(w => ({ value: w.code, label: w.name }))}
                onChange={(_, option: any) => form.setFieldValue('ward', option.label)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="addressDetail" label="Số nhà, đường" rules={[{ required: true }]}>
              <Input prefix={<EnvironmentOutlined />} placeholder="VD: Số 10 ngõ 5..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};