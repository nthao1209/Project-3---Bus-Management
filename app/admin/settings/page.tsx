'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Divider } from 'antd';

export default function AdminSettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings?key=notification_cron_schedule');
      if (res.ok) {
        const data = await res.json();
        const schedule = data.data?.value || '*/5 * * * *';
        setCurrentSchedule(schedule);
        form.setFieldsValue({ cronSchedule: schedule });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'notification_cron_schedule',
          value: values.cronSchedule
        })
      });

      if (res.ok) {
        message.success('Đã cập nhật lịch trình thông báo');
        setCurrentSchedule(values.cronSchedule);
        
        // Trigger cron reload via socket
        try {
          const { io } = await import('socket.io-client');
          const socketOrigin = process.env.NEXT_PUBLIC_SOCKET_ORIGIN ?? 'https://project-3-bus-management-production.up.railway.app';
          const socket = io(socketOrigin, { path: '/socket.io', transports: ['websocket'], reconnectionAttempts: 5 });
          socket.emit('reload_cron_schedule');
          socket.disconnect();
        } catch (err) {
          console.error('Failed to reload cron:', err);
        }
      } else {
        message.error('Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      message.error('Lỗi khi lưu cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron/send-trip-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMode: true })
      });
      if (res.ok) {
        const data = await res.json();
        message.success('Đã gửi thông báo nhắc nhở (Test Mode - tất cả chuyến trong 2h tới)');
        console.log('Manual trigger result:', data);
      } else {
        const error = await res.json();
        message.error(`Gửi thông báo thất bại: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Manual trigger error:', error);
      message.error('Lỗi khi gửi thông báo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Cài Đặt Hệ Thống</h1>

      <Card title="Lịch Gửi Thông Báo Tự Động" className="max-w-2xl">
        <p className="mb-4 text-gray-600">
          Cấu hình lịch trình gửi thông báo nhắc nhở chuyến xe (cron expression)
        </p>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-sm font-semibold">Lịch hiện tại: <code>{currentSchedule}</code></p>
          <p className="text-xs text-gray-500 mt-1">
            Ví dụ: <code>*/5 * * * *</code> = Mỗi 5 phút | <code>0 * * * *</code> = Mỗi giờ | <code>*/10 * * * *</code> = Mỗi 10 phút
          </p>
        </div>

        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item
            name="cronSchedule"
            label="Cron Expression"
            rules={[{ required: true, message: 'Vui lòng nhập lịch trình' }]}
          >
            <Input placeholder="*/5 * * * *" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
              Lưu Cài Đặt
            </Button>
            <Button onClick={handleManualTrigger} loading={loading}>
              Gửi Thông Báo Ngay
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        <div className="text-sm text-gray-600">
          <p className="font-semibold mb-2">Hướng dẫn Cron Expression:</p>
          <pre className="bg-gray-100 p-2 rounded text-xs">
{`* * * * *
│ │ │ │ │
│ │ │ │ └─ Ngày trong tuần (0-6, 0=Chủ nhật)
│ │ │ └─── Tháng (1-12)
│ │ └───── Ngày trong tháng (1-31)
│ └─────── Giờ (0-23)
└───────── Phút (0-59)

Ví dụ:
*/5 * * * *  → Mỗi 5 phút
0 */2 * * *  → Mỗi 2 giờ
30 8 * * *   → 8:30 sáng hàng ngày
0 9-17 * * * → Mỗi giờ từ 9h-17h`}
          </pre>
        </div>
      </Card>
    </div>
  );
}
