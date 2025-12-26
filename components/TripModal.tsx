'use client';

import { Modal, Form, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import TripBaseForm from './TripBaseForm';

export default function TripModal({
  open,
  loading,
  initialValues, // Dữ liệu từ API GET (JSON bạn gửi)
  onCancel,
  onSubmit,
  data
}: any) {

// ... bên trong component TripModal
const [form] = Form.useForm();

useEffect(() => {
  if (open) {
    if (initialValues) {
      // 1. Lấy thông tin cơ bản
      const companyId = initialValues.companyId?._id || initialValues.companyId;
      const routeId = initialValues.routeId?._id || initialValues.routeId;
      const busId = initialValues.busId?._id || initialValues.busId;
      const driverId = initialValues.driverId?._id || initialValues.driverId;

      const depTime = initialValues.departureTime ? dayjs(initialValues.departureTime) : null;
      const arrTime = initialValues.arrivalTime ? dayjs(initialValues.arrivalTime) : null;

      // 2. HÀM CHUẨN HÓA POINTS (QUAN TRỌNG NHẤT)
      const formatPoints = (tripPoints: any[], routeDefaultPoints: any[] = []) => {
        if (!Array.isArray(tripPoints)) return [];

        return tripPoints.map((p, index) => {
          // A. TÍNH OFFSET (Convert Date -> Phút)
          let offset = 0;
          if (p.time && depTime) {
            const pointTime = dayjs(p.time);
            // Tính khoảng cách thời gian so với giờ khởi hành
            const diffMs = pointTime.diff(depTime);
            offset = Math.round(diffMs / 60000); 
          } else {
            // Nếu không có time, lấy offset cũ
            offset = p.timeOffset || 0;
          }

          // B. KHÔI PHỤC ĐỊA CHỈ (Nếu Trip mất địa chỉ, lấy từ Route đắp vào)
          let address = p.address;
          if (!address && routeDefaultPoints[index]) {
              address = routeDefaultPoints[index].address;
          }

          // C. MAP SURCHARGE (DB là 'surcharge', Form là 'defaultSurcharge')
          const surcharge = p.surcharge !== undefined ? p.surcharge : (p.defaultSurcharge || 0);

          return {
            ...p,
            stationId: p.stationId || null,
            name: p.name,
            address: address || '',      // Điền địa chỉ
            timeOffset: offset,          // Điền số phút
            defaultSurcharge: surcharge  // Điền phụ thu
          };
        });
      };

      // Lấy điểm mặc định từ Route để fallback địa chỉ
      const routePickupDefaults = initialValues.routeId?.defaultPickupPoints || [];
      const routeDropoffDefaults = initialValues.routeId?.defaultDropoffPoints || [];

      // 3. ĐẨY VÀO FORM
      form.setFieldsValue({
        ...initialValues,
        companyId,
        routeId,
        busId,
        driverId,
        departureTime: depTime,
        arrivalTime: arrTime,
        // Gọi hàm format ở đây
        pickupPoints: formatPoints(initialValues.pickupPoints, routePickupDefaults),
        dropoffPoints: formatPoints(initialValues.dropoffPoints, routeDropoffDefaults),
      });

    } else {
      form.resetFields();
    }
  }
}, [open, initialValues, form]);

  const handleFinish = (values: any) => {
    const payload = {
      ...values,
      departureTime: values.departureTime ? values.departureTime.toISOString() : null,
      arrivalTime: values.arrivalTime ? values.arrivalTime.toISOString() : null
    };
    onSubmit(payload);
  };

  return (
    <Modal
      open={open}
      title={initialValues ? 'Cập nhật chuyến đi' : 'Tạo chuyến đi'}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={900}
      destroyOnClose={false}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <div className="grid grid-cols-2 gap-4">
          <Form.Item 
            name="departureTime" 
            label="Giờ khởi hành" 
            rules={[{ required: true, message: 'Chọn giờ đi' }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>

          <Form.Item 
            name="arrivalTime" 
            label="Giờ đến dự kiến" 
            rules={[{ required: true, message: 'Chọn giờ đến' }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>
        </div>

        <TripBaseForm data={data} />
      </Form>
    </Modal>
  );
}