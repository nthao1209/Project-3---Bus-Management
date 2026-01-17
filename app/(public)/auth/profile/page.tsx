'use client';

import React, { useEffect, useState } from 'react';
import { 
  Form, Input, Button, Card, Tabs, Avatar, message, Modal, Upload, Spin, Alert 
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  LockOutlined, 
  SaveOutlined, 
  DeleteOutlined,
  CameraOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [infoForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // 1. Fetch dữ liệu User khi vào trang
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/users/user');
      const data = await res.json();

      if (res.status === 401) {
        message.warning('Phiên đăng nhập hết hạn');
        router.push('/auth/login');
        return;
      }

      if (!res.ok) throw new Error(data.message);

      setUser(data.user);
      
      infoForm.setFieldsValue({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
      });

    } catch (error: any) {
      message.error('Không thể tải thông tin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý Cập nhật thông tin chung
 const handleUpdateInfo = async (values: any) => {
  setSubmitting(true);
  try {
    const res = await fetch('/api/users/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        phone: values.phone,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const emailChanged = values.email !== user.email;

    if (emailChanged) {
      message.success('Cập nhật email thành công. Vui lòng đăng nhập lại');

      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.dispatchEvent(new Event('authChanged'));
      localStorage.removeItem('user_info');

      router.push('/auth/login');
      return;
    }

    setUser((prev: any) => ({ ...prev, ...data.user }));
    infoForm.setFieldsValue(data.user);

    message.success('Cập nhật thông tin thành công!');
  } catch (error: any) {
    message.error(error.message);
  } finally {
    setSubmitting(false);
  }
};

  // 3. Xử lý Đổi mật khẩu
 const handleChangePassword = async (values: any) => {
  setSubmitting(true);
  try {
    const res = await fetch('/api/users/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: values.oldPassword,
        newPassword: values.newPassword
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    message.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại');

    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.dispatchEvent(new Event('authChanged'));
    localStorage.removeItem('user_info');

    passwordForm.resetFields();
    router.push('/auth/login');

  } catch (error: any) {
    message.error(error.message);
  } finally {
    setSubmitting(false);
  }
};


  // 4. Xử lý Xóa tài khoản
  const handleDeleteAccount = () => {
    Modal.confirm({
      title: 'Bạn có chắc chắn muốn xóa tài khoản?',
      content: 'Hành động này sẽ vô hiệu hóa tài khoản của bạn. Bạn sẽ không thể đăng nhập lại.',
      okText: 'Xóa ngay',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const res = await fetch('/api/users/user', { method: 'DELETE' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);

          message.success('Tài khoản đã bị xóa.');
          localStorage.removeItem('user_info');
          router.push('/auth/login');
        } catch (error: any) {
          message.error(error.message);
        }
      }
    });
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;
  }

  
  const GeneralInfoTab = () => (
    <Form
      form={infoForm}
      layout="vertical"
      onFinish={handleUpdateInfo}
      className="mt-4"
    >
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex flex-col items-center gap-4">
          <Avatar 
            size={120} 
            icon={<UserOutlined />} 
            className="border-4 border-blue-50"
          />
        </div>

        {/* Cột phải: Form inputs */}
        <div className="flex-1 w-full">
          <Form.Item
            label="Họ và tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input prefix={<UserOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' }, 
              { type: 'email', message: 'Email không hợp lệ' }
            ]}
          >
            <Input prefix={<MailOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
          >
            <Input prefix={<PhoneOutlined />} size="large" />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />} 
              loading={submitting}
              size="large"
              className="bg-[#2474E5]"
            >
              Lưu thay đổi
            </Button>
          </Form.Item>
        </div>
      </div>
    </Form>
  );

  const SecurityTab = () => (
    <div className="max-w-md mx-auto mt-4">
      <Alert 
        message="Bảo mật tài khoản" 
        description="Để đảm bảo an toàn, vui lòng không chia sẻ mật khẩu cho bất kỳ ai." 
        type="info" 
        showIcon 
        className="mb-6"
      />
      
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handleChangePassword}
      >
        <Form.Item
          label="Mật khẩu hiện tại"
          name="oldPassword"
          rules={[{ required: true, message: 'Nhập mật khẩu cũ để xác nhận' }]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
          ]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận lại mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} size="large" />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={submitting}
            size="large"
            className="w-full bg-[#2474E5]"
          >
            Đổi mật khẩu
          </Button>
        </Form.Item>
      </Form>
    </div>
  );

  const DangerZoneTab = () => (
    <div className="mt-4 p-6 border border-red-200 bg-red-50 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
      <div>
        <h3 className="text-lg font-bold text-red-600 mb-1">Xóa tài khoản vĩnh viễn</h3>
        <p className="text-gray-600 text-sm">
          Sau khi xóa, bạn sẽ không thể khôi phục lại vé đã đặt hoặc lịch sử chuyến đi. 
          Tài khoản sẽ bị vô hiệu hóa ngay lập tức.
        </p>
      </div>
      <Button 
        type="primary" 
        danger 
        size="large" 
        icon={<DeleteOutlined />}
        onClick={handleDeleteAccount}
      >
        Xóa tài khoản
      </Button>
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center" >Quản lý tài khoản</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Main Content Tabs */}
          <div className="md:col-span-3">
            <Card className="shadow-sm">
              <Tabs
                defaultActiveKey="1"
                items={[
                  {
                    key: '1',
                    label: 'Thông tin cá nhân',
                    children: <GeneralInfoTab />,
                  },
                  {
                    key: '2',
                    label: 'Đổi mật khẩu',
                    children: <SecurityTab />,
                  },
                  {
                    key: '3',
                    label: <span className="text-red-500">Xóa tài khoản</span>,
                    children: <DangerZoneTab />,
                  },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
