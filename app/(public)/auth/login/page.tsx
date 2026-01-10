'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }

      message.success('Đăng nhập thành công!');
      window.dispatchEvent(new Event('authChanged'));
      localStorage.setItem('user_info', JSON.stringify(data.user));

      switch (data.user.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'driver':
          router.push('/driver');
          break;
        case 'owner':
          router.push('/owner/dashboard');
          break;
        default:
          router.push('/'); 
      }
      
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Card style={{ width: 380, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <Title level={3} style={{ marginBottom: 5 }}>Đăng Nhập</Title>
          <Text type="secondary">Chào mừng bạn quay trở lại</Text>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không đúng định dạng!' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          {/* <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Ghi nhớ tôi</Checkbox>
            </Form.Item> */}
            {/* <a style={{ color: '#1677ff' }} href="#">Quên mật khẩu?</a> */}
          {/* </div> */}

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đăng Nhập
            </Button>
          </Form.Item>

          <div style={{ marginTop: 24 }}>

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text>Chưa có tài khoản? </Text>
            <Link href="/auth/register" style={{ color: '#1677ff', fontWeight: 500 }}>
              Đăng ký ngay
            </Link>
          </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #e6f4ff, #fefce8)',
            border: '1px solid #bae6fd',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <ShopOutlined style={{ fontSize: 26, color: '#1677ff' }} />
          <Title level={5} style={{ margin: '8px 0 4px' }}>
            Bạn là chủ nhà xe?
          </Title>
          <Text type="secondary">
            Đăng ký mở bán vé và quản lý nhà xe trên BusOne
          </Text>

            <div style={{ marginTop: 12 }}>
              <Link href="/auth/owner-register">
                <Button type="primary" size="middle">
                  Đăng ký mở bán vé
                </Button>
              </Link>
            </div>
          </div>
        </div>

        </Form>
      </Card>
    </div>
  );
}