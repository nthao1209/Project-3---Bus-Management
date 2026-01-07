'use client';

import { Modal, Form, InputNumber, Checkbox, TimePicker, Row, Col } from 'antd';
import TripBaseForm from './TripBaseForm';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useEffect } from 'react';

// Plugin cần thiết để parse chuỗi "HH:mm"
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
    if (!open) return;

    if (initialValues) {
      const routeId = initialValues.routeId?._id || initialValues.routeId;
      
      // Tìm object Route đầy đủ trong data (cần data.fullRoutes từ cha truyền vào)
      const currentRoute = data.fullRoutes?.find((r: any) => r._id === routeId);
      const routePickupDefaults = currentRoute?.defaultPickupPoints || [];
      const routeDropoffDefaults = currentRoute?.defaultDropoffPoints || [];

      // 2. Hàm hồi phục dữ liệu (Points)
      const restorePoints = (templatePoints: any[], routeDefaults: any[]) => {
        if (!Array.isArray(templatePoints)) return [];

        return templatePoints.map((p, index) => {
          let address = p.address;
          if (!address && routeDefaults[index]) {
            address = routeDefaults[index].address;
          }

          // B. Khôi phục TimeOffset (Nếu Template mất, lấy từ Route)
          let offset = p.timeOffset;
          if ((offset === undefined || offset === null) && routeDefaults[index]) {
            offset = routeDefaults[index].timeOffset;
          }

          const surcharge = p.defaultSurcharge ?? p.surcharge ?? 0;

          return {
            name: p.name,
            stationId: p.stationId || null,
            address: address || '',       // Đã khôi phục
            timeOffset: offset || 0,      // Đã khôi phục
            defaultSurcharge: surcharge   // Đã map
          };
        });
      };

      // 3. Đẩy dữ liệu vào Form
      form.setFieldsValue({
        /* ===== ID FIELDS ===== */
        companyId: initialValues.companyId?._id || initialValues.companyId,
        routeId: routeId,
        busId: initialValues.busId?._id || initialValues.busId,
        driverId: initialValues.driverId?._id || initialValues.driverId,

        /* ===== BASIC FIELDS ===== */
        basePrice: initialValues.basePrice,
        durationMinutes: initialValues.durationMinutes,
        daysOfWeek: initialValues.daysOfWeek,
        active: initialValues.active,

        /* ===== TIME (String -> Dayjs) ===== */
        departureTimeStr: initialValues.departureTimeStr
          ? dayjs(initialValues.departureTimeStr, 'HH:mm')
          : null,

        /* ===== POINTS (Đã qua hàm hồi phục) ===== */
        pickupPoints: restorePoints(initialValues.pickupPoints, routePickupDefaults),
        dropoffPoints: restorePoints(initialValues.dropoffPoints, routeDropoffDefaults),
      });

    } else {
      // TRƯỜNG HỢP TẠO MỚI
      form.resetFields();
      form.setFieldsValue({
        active: true,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // Mặc định chạy cả tuần
      });
    }
  }, [open, initialValues, form, data.fullRoutes]);

  /* =========================
     SUBMIT HANDLER
  ========================= */
  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      // Convert Dayjs ngược lại thành String "HH:mm"
      departureTimeStr: values.departureTimeStr
        ? values.departureTimeStr.format('HH:mm')
        : null
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
                placeholder="VD: 07:30"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="durationMinutes"
              label="Thời gian di chuyển (phút)"
              rules={[{ required: true, message: 'Nhập thời gian chạy' }]}
            >
              <InputNumber min={1} className="w-full" placeholder="VD: 180" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="daysOfWeek"
          label="Ngày chạy trong tuần"
          rules={[{ required: true, message: 'Chọn ít nhất 1 ngày' }]}
        >
          <Checkbox.Group
            className="grid grid-cols-7 gap-2"
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

        {/* Gọi Form chung */}
        <TripBaseForm data={data} />
      </Form>
    </Modal>
  );
}