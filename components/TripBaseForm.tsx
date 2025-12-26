'use client';

import {
  Form, Select, InputNumber, Row, Col,
  Input, Button, Checkbox, Tooltip
} from 'antd';
import {
  PlusOutlined, MinusCircleOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { AddressModal } from './AddressModal';

const PointRow = ({
  name,
  remove,
  listName,
  data,
  onStationChange,
  onOpenAddress
}: any) => {
  return (
    <Row gutter={8} className="mt-2 items-start">
      <Col span={6}>
        <Form.Item name={[name, 'stationId']} className="mb-0">
          <Select
            placeholder="Chọn trạm..."
            options={data.stations}
            allowClear
            onChange={(val) => onStationChange(val, name, listName)}
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
        <Form.Item shouldUpdate noStyle>
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
                          onClick={() => onOpenAddress(name, listName)}
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

      <Col span={1} className="pt-1 flex justify-center">
        <MinusCircleOutlined
          onClick={() => remove(name)}
          className="text-red-500 cursor-pointer text-lg"
        />
      </Col>
    </Row>
  );
};

// --- MAIN FORM ---
export default function TripBaseForm({ data }: any) {
  const form = Form.useFormInstance();

  // Watch fields
  const selectedCompanyId = Form.useWatch('companyId', form);
  const selectedRouteId = Form.useWatch('routeId', form);
  const pickupPointsData = Form.useWatch('pickupPoints', form);
  const dropoffPointsData = Form.useWatch('dropoffPoints', form);

  // States
  const [customPickup, setCustomPickup] = useState(false);
  const [customDropoff, setCustomDropoff] = useState(false);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingBus, setLoadingBus] = useState(false);
  const [loadingDriver, setLoadingDriver] = useState(false);
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [currentEditField, setCurrentEditField] = useState<any>(null);

  // 1. FIX: Tự động bật Checkbox khi có dữ liệu (Chế độ Sửa)
  useEffect(() => {
    if (pickupPointsData && pickupPointsData.length > 0) setCustomPickup(true);
  }, [pickupPointsData]);

  useEffect(() => {
    if (dropoffPointsData && dropoffPointsData.length > 0) setCustomDropoff(true);
  }, [dropoffPointsData]);

  // 2. Fetch Bus/Driver khi chọn Company
  useEffect(() => {
    if (!selectedCompanyId) {
      setBuses([]);
      setDrivers([]);
      return;
    }
    
    // FIX: BỎ DÒNG RESET FORM Ở ĐÂY ĐỂ TRÁNH MẤT DỮ LIỆU KHI EDIT
    // form.setFieldsValue({ busId: null, driverId: null }); <--- XÓA DÒNG NÀY

    setLoadingBus(true);
    fetch(`/api/owner/companies/${selectedCompanyId}/buses`)
      .then(res => res.json())
      .then(res => setBuses(res.data || []))
      .finally(() => setLoadingBus(false));

    setLoadingDriver(true);
    fetch(`/api/owner/companies/${selectedCompanyId}/drivers`)
      .then(res => res.json())
      .then(res => setDrivers(res.data || []))
      .finally(() => setLoadingDriver(false));
  }, [selectedCompanyId]);

  // Handlers
  const handleStationChange = (stationId: string, index: number, listName: string) => {
    const list = form.getFieldValue(listName) || [];
    const newList = [...list];

    if (!newList[index]) newList[index] = {};

    if (!stationId) {
      newList[index].stationId = null;
    } else {
      const station = data.stations?.find((s: any) => s.value === stationId);
      if (station) {
        newList[index] = {
          ...newList[index],
          stationId,
          name: station.label,
          address: station.address
        };
      }
    }
    form.setFieldValue(listName, newList);
  };

  const openAddressModal = (index: number, list: string) => {
    setCurrentEditField({ index, list });
    setAddrModalOpen(true);
  };

  const handleAddressOk = (address: string) => {
    if (currentEditField) {
      const { index, list } = currentEditField;
      const cur = form.getFieldValue(list) || [];
      const newList = [...cur];
      newList[index] = { ...newList[index], address, stationId: null };
      form.setFieldValue(list, newList);
      setAddrModalOpen(false);
    }
  };

  const toggleCustom = (checked: boolean, listName: string, setter: any, routeField: string) => {
    setter(checked);
    if (!checked) return form.setFieldValue(listName, []); // Tắt thì xóa list

    // Bật lên thì lấy default từ Route
    const currentList = form.getFieldValue(listName);
    if (!currentList || currentList.length === 0) {
      const route = data.fullRoutes?.find((r: any) => r._id === selectedRouteId);
      if (route && route[routeField]) {
        form.setFieldValue(
          listName,
          route[routeField].map((p: any) => ({
            name: p.name,
            address: p.address,
            timeOffset: p.timeOffset,
            defaultSurcharge: p.defaultSurcharge,
            stationId: p.stationId || null
          }))
        );
      } else {
        form.setFieldValue(listName, [{}]);
      }
    }
  };

  return (
    <>
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item name="companyId" label="Nhà xe" rules={[{ required: true }]}>
            <Select 
              options={data.companies} 
              placeholder="Chọn nhà xe" 
              // Reset xe/tài xế KHI VÀ CHỈ KHI người dùng tự thay đổi nhà xe
              onChange={() => form.setFieldsValue({ busId: null, driverId: null })} 
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="routeId" label="Tuyến đường" rules={[{ required: true }]}>
            <Select
              options={data.routes}
              placeholder="Chọn tuyến"
              onChange={() => {
                setCustomPickup(false);
                setCustomDropoff(false);
                form.setFieldsValue({ pickupPoints: [], dropoffPoints: [] });
              }}
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="busId" label="Xe" rules={[{ required: true }]}>
            <Select
              options={buses}
              loading={loadingBus}
              disabled={!selectedCompanyId}
              placeholder="Chọn xe"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="driverId" label="Tài xế">
            <Select
              options={drivers}
              loading={loadingDriver}
              disabled={!selectedCompanyId}
              allowClear
              placeholder="Chọn tài xế"
            />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item name="basePrice" label="Giá vé" rules={[{ required: true }]}>
            <InputNumber
              className="w-full"
              min={0}
              addonAfter="VND"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* PICKUP POINTS */}
      <div className="mt-4 p-4 bg-gray-50 border rounded">
        <Checkbox
          checked={customPickup}
          onChange={(e) => toggleCustom(e.target.checked, 'pickupPoints', setCustomPickup, 'defaultPickupPoints')}
          disabled={!selectedRouteId}
        >
          <strong>Tuỳ chỉnh điểm đón</strong>
        </Checkbox>

        {customPickup && (
          <Form.List name="pickupPoints">
            {(fields, { add, remove }) => (
              <>
                {/* 3. FIX: Sửa lại cú pháp map đúng chuẩn Ant Design */}
                {fields.map(({ key, name }) => (
                  <PointRow
                    key={key}
                    name={name} // Truyền name (index) vào component con
                    remove={remove}
                    listName="pickupPoints"
                    data={data}
                    onStationChange={handleStationChange}
                    onOpenAddress={openAddressModal}
                  />
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} className="mt-2">
                  Thêm điểm đón
                </Button>
              </>
            )}
          </Form.List>
        )}
      </div>

      {/* DROPOFF POINTS */}
      <div className="mt-4 p-4 bg-gray-50 border rounded">
        <Checkbox
          checked={customDropoff}
          onChange={(e) => toggleCustom(e.target.checked, 'dropoffPoints', setCustomDropoff, 'defaultDropoffPoints')}
          disabled={!selectedRouteId}
        >
          <strong>Tuỳ chỉnh điểm trả</strong>
        </Checkbox>

        {customDropoff && (
          <Form.List name="dropoffPoints">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <PointRow
                    key={key}
                    name={name}
                    remove={remove}
                    listName="dropoffPoints"
                    data={data}
                    onStationChange={handleStationChange}
                    onOpenAddress={openAddressModal}
                  />
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} className="mt-2">
                  Thêm điểm trả
                </Button>
              </>
            )}
          </Form.List>
        )}
      </div>

      <AddressModal
        visible={addrModalOpen}
        onCancel={() => setAddrModalOpen(false)}
        onOk={handleAddressOk}
      />
    </>
  );
}