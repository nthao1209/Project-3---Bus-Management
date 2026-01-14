'use client';

import React, { useEffect, useState } from 'react';
import { Table, Rate, Button, Modal, Input, message, Tag, Space, Card, Tooltip } from 'antd';
import { WarningOutlined, SendOutlined, ReloadOutlined, BellOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

// 1. Định nghĩa kiểu dữ liệu (Interface)
interface CompanyStats {
  companyId: string;
  companyName: string;
  ownerId: string;
  avgRating: number;
  totalReviews: number;
  lastReviewDate: string;
}

export default function AdminReviewsPage() {
  const [data, setData] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State cho Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Loading khi đang gửi
  const [selectedCompany, setSelectedCompany] = useState<CompanyStats | null>(null);
  const [warningMsg, setWarningMsg] = useState('');

  // Hàm lấy dữ liệu
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reviews/analytics');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        message.error(json.message || 'Lỗi tải dữ liệu');
      }
    } catch (e) {
      console.error(e);
      message.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mở modal cảnh báo
  const handleOpenWarning = (record: CompanyStats) => {
    setSelectedCompany(record);
    const rating = record.avgRating ? record.avgRating.toFixed(1) : '0';
    setWarningMsg(
      `Cảnh báo chất lượng dịch vụ:\n\nNhà xe ${record.companyName} hiện đang có đánh giá trung bình thấp (${rating}/5). Vui lòng kiểm tra lại quy trình phục vụ và cải thiện chất lượng.`
    );
    setIsModalOpen(true);
  };

  // Gửi cảnh báo
  const sendWarning = async () => {
    if (!warningMsg.trim()) return message.warning('Vui lòng nhập nội dung cảnh báo');
    if (!selectedCompany) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCompany.ownerId,
          title: '⚠️ Cảnh báo từ Quản trị viên',
          message: warningMsg,
          type: 'system' // Đánh dấu là thông báo hệ thống
        })
      });
      
      const json = await res.json();

      if (res.ok) {
        message.success('Đã gửi thông báo đến chủ xe');
        setIsModalOpen(false);
        setWarningMsg(''); // Reset nội dung
      } else {
        message.error(json.message || 'Gửi thất bại');
      }
    } catch (e) {
      message.error('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  };

  // Cấu hình cột bảng
  const columns: ColumnsType<CompanyStats> = [
    {
      title: 'Nhà xe',
      dataIndex: 'companyName',
      key: 'name',
      render: (text) => <b className="text-blue-700">{text}</b>,
      sorter: (a, b) => a.companyName.localeCompare(b.companyName),
    },
    {
      title: 'Số đánh giá',
      dataIndex: 'totalReviews',
      key: 'count',
      align: 'center',
      sorter: (a, b) => a.totalReviews - b.totalReviews,
      render: (val) => <Tag color="default">{val} lượt</Tag>
    },
    {
      title: 'Điểm trung bình',
      dataIndex: 'avgRating',
      key: 'rating',
      align: 'center',
      sorter: (a, b) => a.avgRating - b.avgRating,
      render: (rating: number) => {
        const val = rating || 0;
        let colorClass = 'text-gray-400';
        if (val > 0 && val < 3) colorClass = 'text-red-500';
        else if (val >= 3 && val < 4) colorClass = 'text-orange-500';
        else if (val >= 4) colorClass = 'text-green-600';

        return (
          <div className="flex flex-col items-center">
            <span className={`font-bold text-lg ${colorClass}`}>
                {val.toFixed(1)}
            </span>
            <Rate disabled allowHalf value={val} style={{ fontSize: 12 }} />
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      align: 'center',
      render: (_, r) => {
          if (r.totalReviews === 0) return <Tag>Chưa có đánh giá</Tag>;
          if (r.avgRating < 3) return <Tag color="red">Nguy cơ cao</Tag>;
          if (r.avgRating < 4) return <Tag color="orange">Cần cải thiện</Tag>;
          return <Tag color="green">Tốt</Tag>;
      }
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Tooltip title="Gửi thông báo cảnh báo">
            <Button 
                danger 
                size="small" 
                icon={<WarningOutlined />}
                onClick={() => handleOpenWarning(record)}
            >
                Cảnh báo
            </Button>
        </Tooltip>
      )
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 m-0">Giám sát chất lượng</h2>
            <p className="text-gray-500">Theo dõi đánh giá và gửi cảnh báo tới các nhà xe</p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
        </Button>
      </div>
      
      <Card bordered={false} className="shadow-sm">
        <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="companyId"
            loading={loading}
            pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={
            <div className="flex items-center gap-2 text-red-600">
                <BellOutlined /> Gửi thông báo cảnh báo
            </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={sendWarning}
        okText="Gửi ngay"
        confirmLoading={submitting} // Hiển thị loading trên nút OK
        okButtonProps={{ danger: true, icon: <SendOutlined /> }}
      >
        <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200">
            <span className="font-semibold text-gray-700">Gửi tới:</span> 
            <span className="ml-2 font-bold text-blue-700">{selectedCompany?.companyName}</span>
        </div>
        
        <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung tin nhắn:</label>
        <Input.TextArea 
            rows={5} 
            value={warningMsg}
            onChange={(e) => setWarningMsg(e.target.value)}
            placeholder="Nhập nội dung cảnh báo..."
            className="mb-2"
        />
        <div className="text-xs text-gray-400 text-right">
            Tin nhắn sẽ hiện ngay lập tức trên màn hình của chủ xe.
        </div>
      </Modal>
    </div>
  );
}