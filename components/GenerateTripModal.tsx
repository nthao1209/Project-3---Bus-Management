'use client';

import { useState, useEffect } from 'react';
import { Modal, DatePicker, Table, message, Tag, Button } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { CarOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void; // Callback để reload lại bảng chuyến đi sau khi sinh xong
}

export default function GenerateTripModal({ open, onCancel, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // Mặc định chọn 7 ngày tới
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs(),
    dayjs().add(7, 'day')
  ]);

  // 1. Load danh sách Template khi mở Modal
  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // API này bạn cần có để lấy danh sách template (đã có ở phần owner/trip-templates)
      const res = await fetch('/api/owner/trip-templates'); 
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách mẫu');
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý Sinh lịch
  const handleGenerate = async () => {
    if (!dateRange[0] || !dateRange[1]) {
      return message.warning('Vui lòng chọn khoảng ngày');
    }
    if (selectedRowKeys.length === 0) {
      return message.warning('Vui lòng chọn ít nhất 1 lịch trình mẫu');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/cron/generate-trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
          templateIds: selectedRowKeys // Gửi danh sách ID đã chọn lên
        })
      });

      const json = await res.json();
      if (res.ok) {
        message.success(json.message);
        onSuccess(); // Gọi hàm reload dữ liệu ở trang cha
        onCancel();  // Đóng modal
        setSelectedRowKeys([]); // Reset chọn
      } else {
        message.error(json.message);
      }
    } catch (error) {
      message.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình cột cho bảng
  const columns = [
    {
      title: 'Tuyến đường',
      key: 'route',
      render: (_: any, r: any) => (
        <span className="font-semibold text-blue-700">
           {r.routeId?.name || '---'}
        </span>
      )
    },
    {
      title: 'Giờ chạy',
      dataIndex: 'departureTimeStr',
      key: 'time',
      render: (t: string) => <Tag icon={<ClockCircleOutlined />} color="blue">{t}</Tag>
    },
    {
      title: 'Xe mặc định',
      key: 'bus',
      render: (_: any, r: any) => (
        <span><CarOutlined /> {r.busId?.plateNumber}</span>
      )
    },
    {
      title: 'Ngày chạy',
      dataIndex: 'daysOfWeek',
      render: (days: number[]) => {
        if (!days || days.length === 0) return <Tag>Hàng ngày</Tag>;
        return days.map(d => (
          <Tag key={d} className="mr-1">{d === 0 ? 'CN' : `T${d + 1}`}</Tag>
        ));
      }
    }
  ];

  return (
    <Modal
      title="Sinh lịch chạy tự động"
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>Hủy</Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleGenerate} 
          loading={loading}
          disabled={selectedRowKeys.length === 0}
        >
          Sinh lịch ({selectedRowKeys.length})
        </Button>
      ]}
    >
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn khoảng thời gian:</label>
        <DatePicker.RangePicker 
          value={dateRange} 
          onChange={(val) => setDateRange(val as any)} 
          format="DD/MM/YYYY"
          className="w-full"
        />
      </div>

      <div className="mb-2 font-medium text-gray-700">Chọn các mẫu lịch trình muốn sinh:</div>
      
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={templates}
        loading={loading}
        pagination={{ pageSize: 5 }}
        size="small"
        rowSelection={{
          selectedRowKeys,
          onChange: (newSelectedKeys) => setSelectedRowKeys(newSelectedKeys),
          type: 'checkbox'
        }}
        scroll={{ y: 300 }}
      />
    </Modal>
  );
}