'use client';

import React, { useState } from 'react';
import { Form, Input, Radio, Button, Divider, Card, Space, message } from 'antd';
import { ArrowLeftOutlined, UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { SeatUI } from '@/components/TripSeatSelection'; // Import interface cũ

interface TripPoint {
  stationId?: string;
  name: string;
  time: string; // ISO string
  surcharge?: number;
}

interface BookingInfoProps {
  tripData: any; // Dữ liệu Trip từ API
  selectedSeats: SeatUI[];
  onBack: () => void;
  onConfirm: (bookingDetails: any) => void;
}

export default function BookingInfo({ tripData, selectedSeats, onBack, onConfirm }: BookingInfoProps) {
  const [form] = Form.useForm();
  const [selectedPickup, setSelectedPickup] = useState<string>('');
  const [selectedDropoff, setSelectedDropoff] = useState<string>('');

  // Tính toán tiền
  const seatsPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  
  const pickupPointObj = tripData.pickupPoints.find((p: any) => p._id === selectedPickup);
  const dropoffPointObj = tripData.dropoffPoints.find((p: any) => p._id === selectedDropoff);
  
  const pickupSurcharge = pickupPointObj?.surcharge || 0;
  const totalAmount = seatsPrice + (pickupSurcharge * selectedSeats.length);

  const handleSubmit = (values: any) => {
    if (!selectedPickup || !selectedDropoff) {
      message.error('Vui lòng chọn điểm đón và điểm trả');
      return;
    }

    const payload = {
      ...values,
      pickupPoint: pickupPointObj,
      dropoffPoint: dropoffPointObj,
      selectedSeats,
      totalAmount
    };
    onConfirm(payload);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-[#F2F4F7] min-h-screen pb-20 animate-fadeIn">
      {/* HEADER STEPS */}
      <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <ArrowLeftOutlined className="cursor-pointer hover:text-blue-600" onClick={onBack} />
          <div className="flex items-center gap-2 text-sm">
             <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold">✓</span>
             <span className="text-gray-500">Chọn chỗ</span>
             <span className="text-gray-300 mx-2">————</span>
             <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
             <span className="font-bold text-gray-800">Thông tin</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 flex flex-col md:flex-row gap-6">
        
        {/* LEFT COLUMN: FORM */}
        <div className="flex-1 space-y-6">
          <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            
            {/* 1. Thông tin hành khách */}
            <Card title={<><UserOutlined /> Thông tin hành khách</>} className="shadow-sm border-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item 
                  name="name" 
                  label="Họ và tên" 
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="Nguyễn Văn A" size="large" />
                </Form.Item>
                <Form.Item 
                  name="phone" 
                  label="Số điện thoại" 
                  rules={[{ required: true, pattern: /^[0-9]{10}$/, message: 'SĐT không hợp lệ' }]}
                >
                  <Input prefix={<PhoneOutlined className="text-gray-400" />} placeholder="0901234xxx" size="large" />
                </Form.Item>
              </div>
              <Form.Item name="email" label="Email (Để nhận vé điện tử)">
                <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="email@example.com" size="large" />
              </Form.Item>
            </Card>

            {/* 2. Điểm đón / trả */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Điểm đón */}
              <Card title={<><EnvironmentOutlined className="text-green-500" /> Điểm đón</>} className="shadow-sm border-none h-full">
                <Radio.Group className="w-full" onChange={(e) => setSelectedPickup(e.target.value)} value={selectedPickup}>
                  <Space direction="vertical" className="w-full">
                    {tripData.pickupPoints.map((point: any) => (
                      <Radio key={point._id} value={point._id} className="w-full border rounded-lg p-3 hover:bg-blue-50 transition-colors">
                        <div className="flex justify-between items-start w-full gap-2">
                           <div>
                              <div className="font-bold text-blue-600">{formatTime(point.time)}</div>
                              <div className="text-gray-800 font-medium">{point.name}</div>
                              {point.surcharge > 0 && <span className="text-orange-500 text-xs">+ {point.surcharge.toLocaleString()}đ phụ phí</span>}
                           </div>
                        </div>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </Card>

              {/* Điểm trả */}
              <Card title={<><EnvironmentOutlined className="text-red-500" /> Điểm trả</>} className="shadow-sm border-none h-full">
                <Radio.Group className="w-full" onChange={(e) => setSelectedDropoff(e.target.value)} value={selectedDropoff}>
                  <Space direction="vertical" className="w-full">
                    {tripData.dropoffPoints.map((point: any) => (
                      <Radio key={point._id} value={point._id} className="w-full border rounded-lg p-3 hover:bg-red-50 transition-colors">
                        <div>
                           <div className="font-bold text-gray-800">{formatTime(point.time)}</div>
                           <div className="text-gray-600">{point.name}</div>
                        </div>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </Card>
            </div>

            <Form.Item name="note" label="Ghi chú cho nhà xe" className="mt-6">
              <Input.TextArea rows={3} placeholder="Ví dụ: Tôi mang theo nhiều hành lý..." />
            </Form.Item>
          </Form>
        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="w-full md:w-[380px]">
          <Card className="shadow-md border-none sticky top-24" title="Chi tiết chuyến đi">
            <div className="space-y-4">
              {/* Tuyến đường sơ lược */}
              <div className="flex items-start gap-3">
                 <div className="flex flex-col items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <div className="w-0.5 h-10 bg-gray-200"></div>
                    <div className="w-3 h-3 rounded-full border-2 border-blue-600 bg-white"></div>
                 </div>
                 <div className="text-sm">
                    <div className="mb-4">
                        <div className="font-bold">{formatTime(tripData.departureTime)} • {tripData.routeId.startStationId.province}</div>
                        <div className="text-gray-500 text-xs">{tripData.routeId.startStationId.name}</div>
                    </div>
                    <div>
                        <div className="font-bold">{formatTime(tripData.arrivalTime)} • {tripData.routeId.endStationId.province}</div>
                        <div className="text-gray-500 text-xs">{tripData.routeId.endStationId.name}</div>
                    </div>
                 </div>
              </div>

              <Divider className="my-2" />

              {/* Thông tin ghế */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Số lượng ghế:</span>
                <span className="font-bold">{selectedSeats.length} Ghế</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Số ghế:</span>
                <span className="text-blue-600 font-bold">{selectedSeats.map(s => s.id).join(', ')}</span>
              </div>

              <Divider className="my-2" />

              {/* Chi tiết giá */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Giá vé:</span>
                  <span>{seatsPrice.toLocaleString()}đ</span>
                </div>
                {pickupSurcharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Phụ phí đón:</span>
                    <span className="text-orange-500">+{ (pickupSurcharge * selectedSeats.length).toLocaleString() }đ</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Tổng tiền:</span>
                  <span className="text-blue-600">{totalAmount.toLocaleString()}đ</span>
                </div>
              </div>

              <Button 
                type="primary" 
                size="large" 
                block 
                className="mt-6 h-12 bg-[#FFC700] hover:!bg-[#e6b400] text-black font-bold border-none"
                onClick={() => form.submit()}
              >
                THANH TOÁN
              </Button>
              <p className="text-[11px] text-gray-400 text-center mt-3">
                Bằng cách nhấn nút Thanh toán, bạn đồng ý với <a href="#" className="underline">Chính sách bảo mật</a> và <a href="#" className="underline">Điều khoản sử dụng</a> của chúng tôi.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}