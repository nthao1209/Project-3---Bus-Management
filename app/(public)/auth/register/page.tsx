'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký thất bại');
      }

      message.success('Đăng ký thành công! Đang chuyển hướng...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 1000);
      
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 0 }}>Đăng Ký</Title>
          <Text type="secondary">Tạo tài khoản để đặt vé xe ngay</Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          initialValues={{ role: 'user' }}
        >
          {/* Họ và tên */}
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
          </Form.Item>

          {/* Email */}
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>

          {/* Số điện thoại */}
          <Form.Item
            name="phone"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ!' }
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" />
          </Form.Item>

          {/* Mật khẩu */}
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          {/* Xác nhận mật khẩu (Logic Frontend) */}
          <Form.Item
            name="confirm"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Hai mật khẩu không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đăng Ký
            </Button>
          </Form.Item>

          <Divider style={{ fontSize: 14 }}>Hoặc</Divider>
          
          <div style={{ textAlign: 'center' }}>
            <Text>Đã có tài khoản? </Text>
            <Link href="/auth/login" style={{ color: '#1677ff' }}>Đăng nhập ngay</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}