'use client';

import {
  Modal, Form, Input, Select, InputNumber,
  Row, Col, Button, Tooltip
} from 'antd';
import {
  PlusOutlined, MinusCircleOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { useState } from 'react';
import { AddressModal } from './AddressModal';

interface StationOption {
  value: string;
  name: string;
  address?: string;
}

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  onOpenStationModal: () => void;
  form: any;
  editing?: boolean;
  stations: StationOption[];
}

export default function RouteModal({
  open,
  onCancel,
  onSubmit,
  onOpenStationModal,
  form,
  editing,
  stations
}: Props) {
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [activeField, setActiveField] = useState<{ list: string; index: number } | null>(null);

  const handleStationChange = (val: string, index: number, listName: string) => {
    const station = stations.find(s => s.value === val);
    
    if (station) {
      form.setFields([
        { name: [listName, index, 'name'], value: station.name },             // Tự điền tên điểm
        { name: [listName, index, 'address'], value: station.address || '' },  // Tự điền địa chỉ
        { name: [listName, index, 'timeOffset'], value: 0 },                   // Set 0 phút
        { name: [listName, index, 'defaultSurcharge'], value: 0 }              // Set 0 phụ thu
      ]);
    } else {
      form.setFieldValue([listName, index, 'address'], '');
    }
  };


  const handleAddressOk = (fullAddress: string) => {
    if (!activeField) return;
    form.setFieldValue(
      [activeField.list, activeField.index, 'address'],
      fullAddress
    );
    setAddrModalOpen(false);
  };

  const renderPointList = (listName: string, title: string) => (
    <div className="mt-4 p-4 bg-slate-50 rounded border">
      <h4 className="font-semibold mb-2">{title}</h4>

      <Form.List name={listName}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ name }) => (
              <Row gutter={8} className="mt-2 items-start" key={name}>
                <Col span={6}>
                  <Form.Item name={[name, 'stationId']} className="mb-0">
                    <Select
                      placeholder="Chọn trạm..."
                      options={stations}
                      allowClear
                      onChange={(val) => handleStationChange(val, name, listName)}
                    />
                  </Form.Item>
                </Col>

                <Col span={5}>
                  <Form.Item
                    name={[name, 'name']}
                    rules={[{ required: true, message: 'Nhập tên!' }]}
                    className="mb-0"
                  >
                    <Input placeholder="Tên điểm" />
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item shouldUpdate={(prev, curr) => 
                      prev[listName]?.[name]?.stationId !== curr[listName]?.[name]?.stationId
                  } noStyle>
                    {({ getFieldValue }) => {
                      const isStation = !!getFieldValue([listName, name, 'stationId']);
                      return (
                        <Form.Item name={[name, 'address']} className="mb-0">
                          <Input
                            placeholder="Địa chỉ"
                            readOnly={isStation}
                            className={isStation ? 'bg-gray-100 text-gray-500' : ''}
                            addonAfter={
                              !isStation && (
                                <Tooltip title="Chọn địa chỉ">
                                  <EnvironmentOutlined
                                    className="cursor-pointer text-blue-600"
                                    onClick={() => {
                                      setActiveField({ list: listName, index: name });
                                      setAddrModalOpen(true);
                                    }}
                                  />
                                </Tooltip>
                              )
                            }
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </Col>

                <Col span={3}>
                  <Form.Item name={[name, 'timeOffset']} className="mb-0">
                    <InputNumber className="w-full" placeholder="+Phút" min={0} />
                  </Form.Item>
                </Col>

                <Col span={3}>
                  <Form.Item name={[name, 'defaultSurcharge']} className="mb-0">
                    <InputNumber
                      className="w-full"
                      placeholder="Phụ thu"
                      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>
                </Col>

                <Col span={1} className="pt-1">
                  <MinusCircleOutlined
                    onClick={() => remove(name)}
                    className="text-red-500 cursor-pointer text-lg"
                  />
                </Col>
              </Row>
            ))}

            <Button block type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
              Thêm điểm
            </Button>
          </>
        )}
      </Form.List>
    </div>
  );

  return (
    <>
      <Modal
        title={editing ? 'Cập nhật Tuyến đường' : 'Thêm Tuyến đường mới'}
        open={open}
        onCancel={onCancel}
        onOk={form.submit}
        width={900}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Tên tuyến" rules={[{ required: true }]}>
                <Input placeholder="VD: Hà Nội - Sapa" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Điểm đi" required>
                <div className="flex gap-2">
                  <Form.Item name="startStationId" noStyle rules={[{ required: true }]}>
                    <Select options={stations} className="w-full" />
                  </Form.Item>
                  <Button icon={<PlusOutlined />} onClick={onOpenStationModal} />
                </div>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Điểm đến" required>
                <div className="flex gap-2">
                  <Form.Item name="endStationId" noStyle rules={[{ required: true }]}>
                    <Select options={stations} className="w-full" />
                  </Form.Item>
                  <Button icon={<PlusOutlined />} onClick={onOpenStationModal} />
                </div>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="distanceKm" label="Khoảng cách (km)" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="durationMinutes" label="Thời gian (phút)" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </Col>
          </Row>

          {renderPointList('defaultPickupPoints', '🚏 Điểm đón mặc định')}
          {renderPointList('defaultDropoffPoints', '🏁 Điểm trả mặc định')}
        </Form>
      </Modal>

      <AddressModal
        visible={addrModalOpen}
        onCancel={() => setAddrModalOpen(false)}
        onOk={handleAddressOk}
      />
    </>
  );
}