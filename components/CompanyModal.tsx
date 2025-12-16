'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Input, Row, Col, Divider } from 'antd';
import { 
  ShopOutlined, PhoneOutlined, MailOutlined, 
  UserOutlined, LockOutlined 
} from '@ant-design/icons';
import SelectProvince from '@/components/SeclectProvince';

interface CompanyModalProps {
  open: boolean;
  loading?: boolean;
  initialValues?: any;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  isLoggedIn?:boolean;
}

export default function CompanyModal({
  open,
  loading = false,
  initialValues,
  onCancel,
  onSubmit,
  isLoggedIn = false,
}: CompanyModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [open, initialValues, form]);

  const handleFinish = (values: any) => {
    // Gộp địa chỉ
    let finalAddress = values.address;
    if (values.addressDetail && values.ward && values.district && values.province) {
        finalAddress = `${values.addressDetail}, ${values.ward}, ${values.district}, ${values.province}`;
    }

    const payload = {
        ...values,
        address: finalAddress,
        phone: values.hotline, 
    };
    
    delete payload.addressDetail;
    delete payload.ward;
    delete payload.district;

    onSubmit(payload);
  };

  return (
    <Modal
      title={initialValues ? "Cập nhật Nhà xe" : "Đăng ký Đối tác Nhà xe"}
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={form.submit}
      confirmLoading={loading}
      width={700}
      centered
      okText={initialValues ? "Lưu thay đổi" : "Đăng ký ngay"}
      cancelText="Hủy bỏ"
    >
      <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleFinish}
          className="mt-4"
      >
        {!isLoggedIn && !initialValues && (
          <>
            <h3 className="font-bold text-blue-600 mb-3">1. Thông tin tài khoản chủ xe</h3>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item 
                  name="fullName" 
                  label="Họ và tên chủ xe" 
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item 
                  name="password" 
                  label="Mật khẩu đăng nhập" 
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                >
                  <Input.Password prefix={<LockOutlined />} placeholder="******" />
                </Form.Item>
              </Col>
            </Row>
            <Divider />
            <h3 className="font-bold text-blue-600 mb-3">2. Thông tin doanh nghiệp</h3>
          </>
        )}

        <Row gutter={16}>
          <Col xs={24} md={12}>
              <Form.Item 
                  name="name" 
                  label="Tên nhà xe" 
                  rules={[{ required: true, message: 'Nhập tên nhà xe' }]}
              >
                  <Input prefix={<ShopOutlined />} placeholder="Vd: Phương Trang" />
              </Form.Item>
          </Col>
          <Col xs={24} md={12}>
              <Form.Item 
                  name="hotline" 
                  label="Số điện thoại / Hotline" 
                  rules={[{ required: true, message: 'Nhập SĐT liên hệ' }]}
              >
                  <Input prefix={<PhoneOutlined />} placeholder="0909xxxxxx" />
              </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
              <Form.Item 
                  name="email" 
                  label="Email" 
                  rules={[{ type: 'email', required: true, message: 'Nhập email' }]}
              >
                  <Input prefix={<MailOutlined />} placeholder="contact@example.com" />
              </Form.Item>
          </Col>
          <Col xs={24} md={12}>
              <SelectProvince />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
              <Form.Item name="description" label="Giới thiệu ngắn">
                  <Input.TextArea 
                      rows={3} 
                      placeholder="Mô tả về dịch vụ, các tuyến chính..." 
                      showCount 
                      maxLength={500}
                  />
              </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}