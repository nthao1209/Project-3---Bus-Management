'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Radio, Card, message, Divider, Space } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, CreditCardOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';


interface BookingCheckoutFormProps {
  trip: any;
  selectedSeats: string[];
  pickupPoint: any;
  dropoffPoint: any;
  totalPrice: number;
  onSuccess?: () => void;
}

export default function BookingCheckoutForm({
  trip,
  selectedSeats,
  pickupPoint,
  dropoffPoint,
  totalPrice,
  onSuccess
}: BookingCheckoutFormProps) {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('vnpay'); 

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const bookingRes = await fetch('/api/users/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip._id,
          seatCodes: selectedSeats,
          customerInfo: {
            name: values.name,
            phone: values.phone,
            email: values.email
          },
          pickupPoint: {
            name: pickupPoint.name,
            address: pickupPoint.address,
            time: pickupPoint.time
          },
          dropoffPoint: {
            name: dropoffPoint.name,
            address: dropoffPoint.address
          },
          totalPrice: totalPrice,
          note: values.note,
          paymentMethod: paymentMethod === 'cash' ? 'vnpay' : 'office'
        }),
      });

      const bookingData = await bookingRes.json();
      if (!bookingRes.ok || !bookingData.success) {
        throw new Error(bookingData.message || 'Lỗi tạo vé');
      }

      const bookingId = bookingData.data._id;

      if (paymentMethod === 'vnpay') {
        const paymentRes = await fetch('/api/payment/create_payment_url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: bookingId,
            amount: totalPrice,
            language: 'vn',
            bankCode: ''
          })
        });

        const paymentData = await paymentRes.json();
        
        if (paymentData.success) {
          window.location.href = paymentData.url;
        } else {
          message.error('Không thể tạo link thanh toán');
        }

      } else {
        message.success('Đặt vé thành công! Vui lòng thanh toán tại nhà xe.');
        onSuccess?.();
        router.push(`/my-tickets`);
      }

    } catch (error: any) {
      console.error(error);
      message.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2">
          <Card title="Thông tin hành khách" className="shadow-sm mb-4">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleFinish}
              initialValues={{ paymentMethod: 'vnpay' }}
            >
              <Form.Item
                name="name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Ví dụ: Nguyễn Văn A" size="large" />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="09xxx" size="large" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Email (Nhận vé)"
                  rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                >
                  <Input prefix={<MailOutlined />} placeholder="abc@gmail.com" size="large" />
                </Form.Item>
              </div>

              <Form.Item name="note" label="Ghi chú cho nhà xe">
                <Input.TextArea rows={2} placeholder="Ví dụ: Tôi mang theo nhiều hành lý..." />
              </Form.Item>

              <Divider>Phương thức thanh toán</Divider>
              
              <Radio.Group 
                className="w-full flex flex-col gap-3" 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <div className={`border p-4 rounded-lg flex items-center cursor-pointer transition-all ${paymentMethod === 'vnpay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <Radio value="vnpay" className="w-full">
                    <div className="flex items-center gap-3">
                       <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png" alt="VNPAY" className="h-8 object-contain" />
                       <div>
                          <div className="font-bold">Thanh toán qua VNPAY</div>
                          <div className="text-xs text-gray-500">Quét mã QR, Thẻ ATM, Visa/Mastercard</div>
                       </div>
                    </div>
                  </Radio>
                </div>
                
                <div className={`border p-4 rounded-lg flex items-center cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                   <Radio value="cash" className="w-full">
                    <div className="flex items-center gap-3">
                       <CreditCardOutlined className="text-2xl text-green-600"/>
                       <div>
                          <div className="font-bold">Thanh toán khi lên xe</div>
                          <div className="text-xs text-gray-500">Giữ chỗ trong 24h</div>
                       </div>
                    </div>
                  </Radio>
                </div>
              </Radio.Group>
            </Form>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card className="shadow-md bg-gray-50 border-blue-100 sticky top-24">
             <h3 className="text-lg font-bold mb-4 text-gray-800">Thông tin đặt vé</h3>
             <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Chuyến đi:</span>
                  <span className="font-medium text-right">{trip.route?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Thời gian:</span>
                  <span className="font-medium">{dayjs(trip.departureTime).format('HH:mm DD/MM')}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-gray-500">Ghế đã chọn:</span>
                   <span className="font-bold text-blue-600">{selectedSeats.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-gray-500">Điểm đón:</span>
                   <span className="font-medium text-right truncate w-1/2">{pickupPoint?.name}</span>
                </div>
                <Divider className="my-2"/>
                <div className="flex justify-between items-center text-lg font-bold">
                   <span>Tổng tiền:</span>
                   <span className="text-blue-600">{totalPrice.toLocaleString()} đ</span>
                </div>
             </div>

             <Button 
                type="primary" 
                size="large" 
                block 
                className="mt-6 font-bold h-12 bg-blue-600 hover:bg-blue-700"
                loading={loading}
                onClick={form.submit}
             >
                {paymentMethod === 'vnpay' ? 'THANH TOÁN NGAY' : 'ĐẶT VÉ'}
             </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}