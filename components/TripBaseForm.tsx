import {
  Form, Select, InputNumber, Row, Col,
  Input, Button, Checkbox
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';

export default function TripBaseForm({ data }: any) {
  const [customPickup, setCustomPickup] = useState(false);
  const [customDropoff, setCustomDropoff] = useState(false);

  return (
    <>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item name="companyId" label="Nhà xe" rules={[{ required: true }]}>
            <Select options={data.companies} />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="routeId" label="Tuyến đường" rules={[{ required: true }]}>
            <Select options={data.routes} />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="busId" label="Xe" rules={[{ required: true }]}>
            <Select options={data.buses} />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="driverId" label="Tài xế">
            <Select options={data.drivers} allowClear />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="basePrice" label="Giá vé" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} addonAfter="VND" />
          </Form.Item>
        </Col>
      </Row>

      {/* PICKUP */}
      <div className="mt-4 p-4 border rounded">
        <Checkbox checked={customPickup} onChange={e => setCustomPickup(e.target.checked)}>
          Tuỳ chỉnh điểm đón
        </Checkbox>

        {customPickup && (
          <Form.List name="pickupPoints">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row key={key} gutter={8} className="mt-2">
                    <Col span={8}>
                      <Form.Item name={[name, 'name']} rules={[{ required: true }]}>
                        <Input placeholder="Tên điểm đón" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={[name, 'address']}>
                        <Input placeholder="Địa chỉ" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block onClick={() => add()} icon={<PlusOutlined />}>
                  Thêm điểm đón
                </Button>
              </>
            )}
          </Form.List>
        )}
      </div>

      {/* DROPOFF */}
      <div className="mt-4 p-4 border rounded">
        <Checkbox checked={customDropoff} onChange={e => setCustomDropoff(e.target.checked)}>
          Tuỳ chỉnh điểm trả
        </Checkbox>

        {customDropoff && (
          <Form.List name="dropoffPoints">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row key={key} gutter={8} className="mt-2">
                    <Col span={8}>
                      <Form.Item name={[name, 'name']} rules={[{ required: true }]}>
                        <Input placeholder="Tên điểm trả" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name={[name, 'address']}>
                        <Input placeholder="Địa chỉ" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block onClick={() => add()} icon={<PlusOutlined />}>
                  Thêm điểm trả
                </Button>
              </>
            )}
          </Form.List>
        )}
      </div>
    </>
  );
}
