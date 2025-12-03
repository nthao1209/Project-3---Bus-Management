'use client';

import React, { useState } from 'react';
import { Form, Input, Select, Button, Radio, Checkbox, message, Card, ConfigProvider } from 'antd';
import { useRouter } from 'next/navigation';

const { TextArea } = Input;
const { Option } = Select;
const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", 
  "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", 
  "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", 
  "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", 
  "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", 
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", 
  "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", 
  "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", 
  "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", 
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh", 
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
].map(province => ({ label: province, value: province }));


export default function OwnerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/users/owner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Đăng ký thất bại');
      }

      message.success('Đăng ký thành công! Vui lòng đăng nhập.');
      router.push('/auth/login');
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2474E5] flex items-center justify-center py-10 px-4 relative overflow-hidden">

      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="text-white space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Tăng 30% lượng khách<br />
              đặt vé khi mở bán online<br />
              trên BusOne ngay<br />
              hôm nay!
            </h1>
            <p className="text-lg opacity-90 font-medium">
              Đăng ký miễn phí và chỉ mất 1 phút để hoàn tất
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-2xl">
            <h2 className="text-gray-800 font-bold text-center mb-1 text-lg">
              Bắt đầu lấp đầy chỗ trống trên xe của bạn
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm">
              với hàng triệu lượt khách đi thành công trên BusOne
            </p>

            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: '#FFC700',
                },
              }}
            >
              <Form
                layout="vertical"
                onFinish={onFinish}
                size="middle"
                initialValues={{ fleetSize: '1 xe - 4 xe' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <Form.Item
                    label="Họ và tên"
                    name="fullName"
                    rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                  >
                    <Input placeholder="Nhập họ tên người liên hệ" className="bg-gray-50 border-gray-300" />
                  </Form.Item>
                  <Form.Item
                    label="Số điện thoại liên hệ"
                    name="phone"
                    rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                  >
                    <Input placeholder="Nhập số điện thoại" className="bg-gray-50 border-gray-300" />
                  </Form.Item>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <Form.Item
                    label="Tên nhà xe"
                    name="companyName"
                    rules={[{ required: true, message: 'Vui lòng nhập tên nhà xe' }]}
                  >
                    <Input placeholder="Nhập tên nhà xe" className="bg-gray-50 border-gray-300" />
                  </Form.Item>

                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: 'Vui lòng nhập email' },
                      { type: 'email', message: 'Email không hợp lệ' }
                    ]}
                  >
                    <Input placeholder="Nhập email" className="bg-gray-50 border-gray-300" />
                  </Form.Item>
                </div>
                 <Form.Item
                    label={<span className="text-red-500 font-semibold">Mật khẩu đăng nhập hệ thống *</span>}
                    name="password"
                    rules={[{ required: true, message: 'Vui lòng tạo mật khẩu' }]}
                  >
                    <Input.Password placeholder="Tạo mật khẩu đăng nhập" className="bg-gray-50 border-gray-300" />
                  </Form.Item>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">

                  <Form.Item
                    label="Trụ sở chính của nhà xe ở tỉnh nào?"
                    name="province"
                    rules={[{ required: true, message: 'Vui lòng chọn tỉnh' }]}
                  >
                    <Select 
                      placeholder="Chọn hoặc tìm kiếm tỉnh/thành phố" 
                      className="bg-gray-50"
                      options={PROVINCES} 
                      showSearch={{
                        filterOption:(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Số lượng xe của nhà xe trong khoảng nào?"
                    name="fleetSize"
                    rules={[{ required: true, message: 'Vui lòng chọn quy mô' }]}
                  >
                    <Radio.Group className="flex flex-col gap-2 text-sm">
                      <Radio value="> 40 xe">&gt; 40 xe</Radio>
                      <Radio value="20 xe - 39 xe">20 xe - 39 xe</Radio>
                      <Radio value="5 xe - 19 xe">5 xe - 19 xe</Radio>
                      <Radio value="1 xe - 4 xe">1 xe - 4 xe</Radio>
                      <Radio value="Khác">Khác</Radio>
                    </Radio.Group>
                  </Form.Item>
                </div>

                <Form.Item
                  label="Nội dung tư vấn"
                  name="note"
                >
                  <TextArea 
                    rows={3} 
                    placeholder="VD: Mở bán vé tuyến đường a -> b trên BusOne" 
                    className="bg-gray-50 border-gray-300"
                  />
                </Form.Item>

                <Form.Item className="mb-0">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    block
                    className="h-12 text-black font-bold text-base !bg-[#FFC700] hover:!bg-[#e0b000] border-none rounded-md"
                  >
                    ĐĂNG KÝ MỞ BÁN
                  </Button>
                </Form.Item>

              </Form>
            </ConfigProvider>
          </div>

        </div>
      </div>
    </div>
  );
}