'use client';

import {
  Modal, Form, Input, Select, InputNumber,
  Row, Col, Button
} from 'antd';
import {
  PlusOutlined, MinusCircleOutlined
} from '@ant-design/icons';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  onOpenStationModal: () => void;
  form: any;
  editing?: boolean;
  stations: any[];
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
  return (
    <Modal
      title={editing ? 'Cập nhật Tuyến đường' : 'Thêm Tuyến đường mới'}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      width={900}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        {/* BASIC INFO */}
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
                  <Select
                    options={stations}
                    showSearch
                    className="w-full"
                    placeholder="Chọn điểm đi"
                    filterOption={(i, o: any) =>
                      o?.searchText?.toLowerCase().includes(i.toLowerCase())
                    }
                  />
                </Form.Item>
                <Button icon={<PlusOutlined />} onClick={onOpenStationModal} />
              </div>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item label="Điểm đến" required>
              <div className="flex gap-2">
                <Form.Item name="endStationId" noStyle rules={[{ required: true }]}>
                  <Select
                    options={stations}
                    showSearch
                    className="w-full"
                    placeholder="Chọn điểm đến"
                    filterOption={(i, o: any) =>
                      o?.searchText?.toLowerCase().includes(i.toLowerCase())
                    }
                  />
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

        {/* PICKUP POINTS */}
        <div className="mt-4 p-4 bg-slate-50 rounded border">
          <h4 className="font-semibold mb-2">🚏 Điểm đón mặc định</h4>
          <Form.List name="defaultPickupPoints">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row key={key} gutter={8} className="mb-2">
                    <Col span={8}>
                      <Form.Item {...rest} name={[name, 'name']} noStyle>
                        <Input placeholder="Tên điểm đón" />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item {...rest} name={[name, 'address']} noStyle>
                        <Input placeholder="Địa chỉ" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item {...rest} name={[name, 'timeOffset']} noStyle>
                        <InputNumber className="w-full" placeholder="+phút" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        className="text-red-500 cursor-pointer"
                      />
                    </Col>
                  </Row>
                ))}
                <Button block type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  Thêm điểm đón
                </Button>
              </>
            )}
          </Form.List>
        </div>

        {/* DROPOFF POINTS */}
        <div className="mt-4 p-4 bg-slate-50 rounded border">
          <h4 className="font-semibold mb-2">🏁 Điểm trả mặc định</h4>
          <Form.List name="defaultDropoffPoints">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Row key={key} gutter={8} className="mb-2">
                    <Col span={10}>
                      <Form.Item {...rest} name={[name, 'name']} noStyle>
                        <Input placeholder="Tên điểm trả" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item {...rest} name={[name, 'address']} noStyle>
                        <Input placeholder="Địa chỉ" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <MinusCircleOutlined
                        onClick={() => remove(name)}
                        className="text-red-500 cursor-pointer"
                      />
                    </Col>
                  </Row>
                ))}
                <Button block type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                  Thêm điểm trả
                </Button>
              </>
            )}
          </Form.List>
        </div>
      </Form>
    </Modal>
  );
}
