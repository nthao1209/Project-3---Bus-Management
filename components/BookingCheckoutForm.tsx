'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Radio, Card, message, Divider, Drawer, Space } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined, CreditCardOutlined, InfoCircleOutlined, ShoppingCartOutlined } from '@ant-design/icons';
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

// Hàm format tiền tệ
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

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
  
  // State quản lý Drawer xem chi tiết trên mobile
  const [openDetail, setOpenDetail] = useState(false);

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
          paymentMethod: paymentMethod === 'cash' ? 'office' : 'vnpay'
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

  // Component hiển thị chi tiết vé (Tái sử dụng cho Desktop Card và Mobile Drawer)
  const TicketSummaryContent = () => (
    <div className="space-y-3 text-sm">
        <div className="flex justify-between">
            <span className="text-gray-500">Chuyến đi:</span>
            <span className="font-medium text-right">{trip.route?.name}</span>
        </div>
        <div className="flex justify-between">
            <span className="text-gray-500">Thời gian:</span>
            <span className="font-medium">{dayjs(trip.departureTime).format('HH:mm DD/MM/YYYY')}</span>
        </div>
        <div className="flex justify-between">
            <span className="text-gray-500">Ghế đã chọn:</span>
            <span className="font-bold text-blue-600">{selectedSeats.join(', ')}</span>
        </div>
        <Divider className="my-2" />
        <div className="flex justify-between">
            <span className="text-gray-500">Điểm đón:</span>
            <span className="font-medium text-right w-2/3 truncate">{pickupPoint?.name}</span>
        </div>
        <div className="text-xs text-gray-400 text-right">{pickupPoint?.address}</div>
        
        <div className="flex justify-between mt-2">
            <span className="text-gray-500">Điểm trả:</span>
            <span className="font-medium text-right w-2/3 truncate">{dropoffPoint?.name}</span>
        </div>
        <div className="text-xs text-gray-400 text-right">{dropoffPoint?.address}</div>

        <Divider className="my-2"/>
        <div className="flex justify-between items-center text-lg font-bold">
            <span>Tổng tiền:</span>
            <span className="text-blue-600">{formatCurrency(totalPrice)}</span>
        </div>
    </div>
  );

  return (
    // Thêm padding-bottom để không bị che bởi Sticky Footer trên mobile
    <div className="max-w-4xl mx-auto p-3 md:p-4 pb-28 md:pb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Cột Trái: Form nhập liệu & Chọn thanh toán */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Form Thông tin hành khách */}
          <Card title="Thông tin hành khách" className="shadow-sm rounded-xl">
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
                className="mb-4"
              >
                <Input prefix={<UserOutlined />} placeholder="Ví dụ: Nguyễn Văn A" size="large" />
              </Form.Item>

              {/* Mobile: 1 cột, Desktop: 2 cột */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0">
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}
                  className="mb-4"
                >
                  <Input prefix={<PhoneOutlined />} placeholder="09xxx" size="large" type="tel" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Email (Nhận vé)"
                  rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
                  className="mb-4"
                >
                  <Input prefix={<MailOutlined />} placeholder="abc@gmail.com" size="large" type="email" />
                </Form.Item>
              </div>

              <Form.Item name="note" label="Ghi chú cho nhà xe" className="mb-0">
                <Input.TextArea rows={2} placeholder="Ví dụ: Đón tôi ở ngã ba..." />
              </Form.Item>
            </Form>
          </Card>

          {/* Form Chọn phương thức thanh toán */}
          <Card title="Phương thức thanh toán" className="shadow-sm rounded-xl">
             <Radio.Group 
                className="w-full flex flex-col gap-3" 
                value={paymentMethod} 
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {/* VNPAY */}
                <div 
                    onClick={() => setPaymentMethod('vnpay')}
                    className={`border p-3 md:p-4 rounded-lg flex items-center cursor-pointer transition-all active:scale-95 ${paymentMethod === 'vnpay' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200'}`}
                >
                  <Radio value="vnpay" className="w-full">
                    <div className="flex items-center gap-3 w-full">
                       <img src="https://vnpay.vn/s1/statics.vnpay.vn/2023/9/06ncktiwd6dc1694418196384.png" alt="VNPAY" className="h-8 w-8 md:h-10 md:w-10 object-contain rounded" />
                       <div className="flex-1">
                          <div className="font-bold text-gray-800 text-sm md:text-base">Thanh toán VNPAY</div>
                          <div className="text-xs text-gray-500">Quét mã QR, Thẻ ATM, Visa</div>
                       </div>
                    </div>
                  </Radio>
                </div>
                
                {/* Tiền mặt */}
                <div 
                    onClick={() => setPaymentMethod('cash')}
                    className={`border p-3 md:p-4 rounded-lg flex items-center cursor-pointer transition-all active:scale-95 ${paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200'}`}
                >
                   <Radio value="cash" className="w-full">
                    <div className="flex items-center gap-3 w-full">
                       <div className="h-8 w-8 md:h-10 md:w-10 bg-green-100 rounded flex items-center justify-center text-green-600">
                            <CreditCardOutlined className="text-xl"/>
                       </div>
                       <div className="flex-1">
                          <div className="font-bold text-gray-800 text-sm md:text-base">Thanh toán khi lên xe</div>
                          <div className="text-xs text-gray-500">Giữ chỗ trong 24h</div>
                       </div>
                    </div>
                  </Radio>
                </div>
              </Radio.Group>
          </Card>
        </div>

        {/* Cột Phải: Thông tin chuyến đi (Chỉ hiện trên Desktop) */}
        <div className="hidden md:block md:col-span-1">
          <Card className="shadow-md bg-gray-50 border-blue-100 sticky top-24 rounded-xl">
             <h3 className="text-lg font-bold mb-4 text-gray-800">Thông tin đặt vé</h3>
             <TicketSummaryContent />
             <Button 
                type="primary" 
                size="large" 
                block 
                className="mt-6 font-bold h-12 bg-blue-600 hover:bg-blue-700 shadow-lg"
                loading={loading}
                onClick={form.submit}
             >
                {paymentMethod === 'vnpay' ? 'THANH TOÁN NGAY' : 'ĐẶT VÉ'}
             </Button>
          </Card>
        </div>
      </div>

      {/* --- MOBILE STICKY FOOTER --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t z-50 md:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.1)] px-4 py-3 safe-area-pb">
        <div className="flex justify-between items-center gap-3">
            <div 
                className="flex flex-col cursor-pointer"
                onClick={() => setOpenDetail(true)}
            >
                <div className="flex items-center text-gray-500 text-xs">
                    Tổng tiền <InfoCircleOutlined className="ml-1" />
                </div>
                <div className="text-blue-600 font-bold text-lg leading-tight">
                    {formatCurrency(totalPrice)}
                </div>
                <div className="text-[10px] text-blue-500 underline">Xem chi tiết</div>
            </div>

            <Button 
                type="primary" 
                size="large" 
                className="flex-1 h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-md rounded-lg"
                loading={loading}
                onClick={form.submit}
            >
                {paymentMethod === 'vnpay' ? 'Thanh toán' : 'Đặt vé'}
            </Button>
        </div>
      </div>

      {/* Drawer xem chi tiết trên Mobile */}
      <Drawer
        title="Chi tiết đơn hàng"
        placement="bottom"
        onClose={() => setOpenDetail(false)}
        open={openDetail}
        height="70vh"
        className="md:hidden"
      >
        <TicketSummaryContent />
      </Drawer>

    </div>
  );
}