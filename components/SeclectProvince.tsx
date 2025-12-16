'use client';

import { useEffect, useState } from 'react';
import { Form, Select, Input } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const PROVINCES_API = 'https://provinces.open-api.vn/api/?depth=1';

const removeVietnameseTones = (str: string) =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const DISTRICTS_API = (code: number) =>
  `https://provinces.open-api.vn/api/p/${code}?depth=2`;

const WARDS_API = (code: number) =>
  `https://provinces.open-api.vn/api/d/${code}?depth=2`;

export default function SelectProvince() {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [districtCode, setDistrictCode] = useState<number | null>(null);

  const form = Form.useFormInstance();

  useEffect(() => {
    fetch(PROVINCES_API)
      .then(res => res.json())
      .then(data => setProvinces(data));
  }, []);

  const loadDistricts = async (code: number) => {
    const res = await fetch(DISTRICTS_API(code));
    const data = await res.json();
    setDistricts(data.districts || []);
    setWards([]);
  };

  const loadWards = async (code: number) => {
    const res = await fetch(WARDS_API(code));
    const data = await res.json();
    setWards(data.wards || []);
  };

  return (
    <>
      <Form.Item
        name="province"
        label="Tỉnh / Thành phố"
        rules={[{ required: true }]}
      >
        <Select
          placeholder="Chọn tỉnh"
          showSearch
          filterOption={(input, option) =>
            removeVietnameseTones(option?.label as string).includes(
              removeVietnameseTones(input)
            )
          }
          onChange={(code, option: any) => {
            setProvinceCode(code);
            form.setFieldsValue({
              province: option.label, 
              district: undefined,
              ward: undefined,
            });
            loadDistricts(code);
          }}
          options={provinces.map(p => ({
            value: p.code, 
            label: p.name, 
          }))}
        />
      </Form.Item>

      <Form.Item
        name="district"
        label="Quận / Huyện"
        rules={[{ required: true }]}
      >
        <Select
          placeholder="Chọn quận/huyện"
          disabled={!provinceCode}
          showSearch
          filterOption={(input, option) =>
            removeVietnameseTones(option?.label as string).includes(
              removeVietnameseTones(input)
            )
          }
          onChange={(code, option: any) => {
            setDistrictCode(code);
            form.setFieldsValue({
              district: option.label, 
              ward: undefined,
            });
            loadWards(code);
          }}
          options={districts.map(d => ({
            value: d.code,
            label: d.name,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="ward"
        label="Xã / Phường"
        rules={[{ required: true }]}
      >
        <Select
          placeholder="Chọn xã/phường"
          disabled={!districtCode}
          showSearch
          filterOption={(input, option) =>
            removeVietnameseTones(option?.label as string).includes(
              removeVietnameseTones(input)
            )
          }
          onChange={(_, option: any) => {
            form.setFieldsValue({
              ward: option.label, 
            });
          }}
          options={wards.map(w => ({
            value: w.code,
            label: w.name,
          }))}
        />
      </Form.Item>

      <Form.Item
        name="addressDetail"
        label="Địa chỉ cụ thể"
        rules={[{ required: true }]}
      >
        <Input
          prefix={<EnvironmentOutlined />}
          placeholder="Số nhà, đường..."
        />
      </Form.Item>
    </>
  );
}
