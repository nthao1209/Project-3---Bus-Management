'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Tabs, Card, Tag, Button, Spin, Empty, Modal, Descriptions, message, Popconfirm 
} from 'antd';
import { 
  ClockCircleOutlined, CarOutlined, EnvironmentOutlined, 
  BarcodeOutlined, QrcodeOutlined, CreditCardOutlined, StarOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import ReviewModal from '@/components/ReviewModal';
import { createSocket } from '@/lib/socketClient';

interface Ticket {
  _id: string;
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'boarded';
  totalPrice: number;
  seatCodes: string[];
  createdAt: string;
  paymentExpireAt?: string;
  tripId: {
    _id: string;
    departureTime: string;
    status: 'scheduled' | 'running' | 'completed' | 'cancelled';
    routeId: { name: string };
    busId: { plateNumber: string; type: string };
  };
  isReviewed: boolean;
  reviewDetail?: {
      rating: number;
      comment: string;
  };
  pickupPoint?: { name: string; address: string; time: string };
  dropoffPoint?: { name: string; address: string };
  customerInfo: { name: string; phone: string };
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [reviewData, setReviewData] = useState<any>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [openReview, setOpenReview] = useState(false);
  const [reviewTripId, setReviewTripId] = useState<string| null>(null);

  // 1. Fetch dữ liệu
  const fetchTickets = async () => {
    if (tickets.length === 0) setLoading(true);
    try {
      const res = await fetch('/api/users/my-tickets');
      const json = await res.json();
      if (json.success) {
        setTickets(json.data);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách vé');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // --- LOGIC SOCKET REALTIME (ĐÃ SỬA) ---
  useEffect(() => {
    // Chỉ kết nối khi đã có danh sách vé để biết cần join vào chuyến nào
    if (tickets.length === 0) return;

    // Khởi tạo socket (dynamic import to ensure browser-only module)
    let socketInstance: Socket | null = null;
    let mounted = true;
    (async () => {
      try {
        const mod = await import('@/lib/socketClient');
        if (!mounted) return;
        socketInstance = mod.createSocket();

        socketInstance.on('connect', () => {
          // Lấy danh sách các Trip ID từ vé của user
          const uniqueTripIds = Array.from(new Set(tickets.map(t => t.tripId._id)));
          uniqueTripIds.forEach(tripId => {
            socketInstance?.emit('join_trip', tripId);
          });
        });

        // 1. Lắng nghe cập nhật trạng thái Vé (Khi Tài xế bấm Thu tiền / Đã đón)
        socketInstance.on('booking_updated', (data: any) => {
      
      setTickets(prevTickets => prevTickets.map(ticket => {
        // Chỉ cập nhật đúng vé có ID tương ứng
        if (ticket._id === data.bookingId) {
          if (data.status === 'confirmed') message.success('Vé đã được xác nhận thanh toán!');
          if (data.status === 'boarded') message.success('Đã xác nhận lên xe!');
          
          return { ...ticket, status: data.status };
        }
        return ticket;
      }));
    });

        // 2. Lắng nghe cập nhật trạng thái Chuyến đi (Khi Tài xế bấm Hoàn thành)
        socketInstance.on('trip_status_updated', (data: any) => {

      setTickets(prevTickets => prevTickets.map(ticket => {
        if (ticket.tripId._id === data.tripId) {
          // Cập nhật trạng thái chuyến đi lồng bên trong vé
          return { 
            ...ticket, 
            tripId: { ...ticket.tripId, status: data.status } 
          };
        }
        return ticket;
      }));
    });

        socketInstance.on('disconnect', () => {
          // noop
        });
      } catch (err) {
        console.error('Socket init error:', err);
      }
    })();

    // Cleanup khi unmount
    return () => {
      mounted = false;
      try { socketInstance?.disconnect(); } catch (e) {}
    };
  }, [tickets.length]); // Chạy lại khi số lượng vé thay đổi (để join room mới nếu mua thêm vé)


  // 2. Xử lý Tab Filter (Cập nhật lại filter mỗi khi tickets thay đổi do Socket)
  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter(t => t.status === activeTab));
    }
  }, [tickets, activeTab]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'confirmed': return <Tag color="green">Đã xác nhận</Tag>;
      case 'pending_payment': return <Tag color="orange">Chờ thanh toán</Tag>;
      case 'cancelled': return <Tag color="red">Đã hủy</Tag>;
      case 'boarded': return <Tag color="blue">Đã lên xe</Tag>;
      default: return <Tag>Không rõ</Tag>;
    }
  };

  // 4. Xử lý Thanh toán lại
  const handleRepay = async (ticket: Ticket) => {
    try {
      message.loading({ content: 'Đang tạo cổng thanh toán...', key: 'repay' });
      const res = await fetch('/api/payment/create_payment_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: ticket._id,
          amount: ticket.totalPrice,
          language: 'vn'
        })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.url;
      } else {
        message.error({ content: data.message || 'Lỗi tạo thanh toán', key: 'repay' });
      }
    } catch (e) {
      message.error({ content: 'Lỗi kết nối', key: 'repay' });
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      message.loading({ content: 'Đang hủy vé...', key: 'cancel' });
      const res = await fetch('/api/users/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId })
      });
      const data = await res.json();
      
      if (data.success) {
        message.success({ content: 'Đã hủy vé', key: 'cancel' });
        // Gọi lại fetchTickets để đồng bộ
        fetchTickets(); 
      } else {
        message.error({ content: data.message || 'Lỗi hủy vé', key: 'cancel' });
      }
    } catch (e) {
      message.error({ content: 'Lỗi kết nối', key: 'cancel' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Vé của tôi</h1>

        {/* TABS */}
        <div className="bg-white p-2 rounded-lg shadow-sm mb-6">
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={[
              { label: 'Tất cả', key: 'all' },
              { label: 'Chờ thanh toán', key: 'pending_payment' },
              { label: 'Đã đặt', key: 'confirmed' },
              { label: 'Lịch sử/Đã hủy', key: 'cancelled' },
            ]}
          />
        </div>

        {/* DANH SÁCH VÉ */}
        {loading ? (
          <div className="text-center py-20"><Spin size="large" /></div>
        ) : filteredTickets.length === 0 ? (
          <Empty description="Bạn chưa có vé nào" className="mt-10" />
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <Card 
                key={ticket._id} 
                className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                bodyStyle={{ padding: '16px 24px' }}
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  
                  {/* Cột Trái */}
                  <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-blue-900 m-0">
                            {ticket.tripId?.routeId?.name || 'Tuyến (không xác định)'}
                          </h3>

                          {/* Trạng thái vé – CHỈ hiện khi chưa completed */}
                          {ticket.tripId?.status && ticket.tripId.status !== 'completed' && (
                            <div className="md:hidden">
                              {getStatusTag(ticket.status)}
                            </div>
                          )}

                          {/* Trạng thái chuyến */}
                          {ticket.tripId?.status === 'completed' && (
                            <Tag color="cyan">Đã hoàn thành chuyến đi</Tag>
                          )}
                        </div>

                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-gray-600 text-sm mt-3">
                        <div className="flex items-center gap-2">
                            <ClockCircleOutlined className="text-blue-500"/>
                            <span className="font-semibold text-gray-800">
                                {ticket.tripId?.departureTime ? dayjs(ticket.tripId.departureTime).format('HH:mm - DD/MM/YYYY') : 'Thời gian (không xác định)'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CarOutlined className="text-blue-500"/>
                            <span>{ticket.tripId?.busId?.plateNumber || 'Xe (không xác định)'} ({ticket.tripId?.busId?.type || '-'})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <EnvironmentOutlined className="text-red-500"/>
                            <span className="truncate max-w-[200px]" title={ticket.pickupPoint?.name}>
                                Đón: {ticket.pickupPoint?.name || 'Tại bến'}
                            </span>
                        </div>
                         <div className="flex items-center gap-2">
                            <BarcodeOutlined className="text-gray-500"/>
                            <span>Mã vé: <span className="font-mono font-bold">{ticket._id.slice(-6).toUpperCase()}</span></span>
                        </div>
                    </div>
                  </div>

                  {/* Cột Phải */}
                  <div className="flex flex-col justify-between items-end min-w-[150px] border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-gray-100">
                    <div className="hidden md:block mb-2">
                         {getStatusTag(ticket.status)}
                    </div>
                    
                    <div className="text-right mb-3">
                        <div className="text-xs text-gray-500">Tổng tiền</div>
                        <div className="text-xl font-bold text-orange-600">
                            {ticket.totalPrice.toLocaleString()} đ
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Ghế: <span className="font-bold text-black">{ticket.seatCodes.join(', ')}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full justify-end flex-wrap">
                        {/* Nút Thanh toán */}
                        {ticket.status === 'pending_payment' && (
                             <Button 
                                type="primary" 
                                danger 
                                size="small" 
                                icon={<CreditCardOutlined />}
                                onClick={() => handleRepay(ticket)}
                             >
                                Thanh toán
                             </Button>
                        )}
                        
                        {/* Nút Hủy */}
                         {(ticket.status === 'pending_payment' || ticket.status === 'confirmed') && (
                          <Popconfirm
                              title="Hủy vé này?"
                              onConfirm={() => handleCancel(ticket._id)}
                              okText="Đồng ý hủy"
                              cancelText="Không"
                          >
                              <Button danger size="small">Hủy vé</Button>
                          </Popconfirm>
                      )}

                      {/* Nút Đánh giá */}
                        {ticket.tripId?.status === 'completed' && 
                          ['confirmed', 'boarded', 'completed'].includes(ticket.status) && (
                            <>
                                {ticket.isReviewed ? (
                                    <Button 
                                        size="small"
                                        className="text-green-600 border-green-600 hover:text-green-500"
                                        onClick={() => {
                                            setReviewData(ticket.reviewDetail); 
                                            setReviewTripId(ticket.tripId._id);
                                            setOpenReview(true);
                                        }}
                                    >
                                        Xem đánh giá
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        icon={<StarOutlined />}
                                        className="text-yellow-600 border-yellow-600 hover:text-yellow-500"
                                        onClick={() => {
                                            setReviewData(null); 
                                            setReviewTripId(ticket.tripId._id);
                                            setOpenReview(true);
                                        }}
                                    >
                                        Đánh giá
                                    </Button>
                                )}
                            </>
                        )}
                        <Button 
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setIsModalOpen(true);
                            }}
                            size="small"
                        >
                            Chi tiết
                        </Button>
                    </div>
                  </div>

                </div>
              </Card>
            ))}
          </div>
        )}

        {/* MODAL CHI TIẾT */}
        <Modal
            title="Chi tiết vé xe"
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            footer={[
                <Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>
            ]}
            width={700}
        >
            {selectedTicket && (
                <div className="py-4">
                    {/* QR Code Giả lập */}
                    <div className="flex flex-col items-center justify-center mb-6 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                        <QrcodeOutlined style={{ fontSize: 120, color: '#333' }} />
                        <span className="mt-2 font-mono text-lg font-bold tracking-widest">
                            {selectedTicket._id.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">Đưa mã này cho nhân viên nhà xe</span>
                    </div>

                    <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                        <Descriptions.Item label="Hành khách">{selectedTicket.customerInfo.name}</Descriptions.Item>
                        <Descriptions.Item label="Số điện thoại">{selectedTicket.customerInfo.phone}</Descriptions.Item>
                        
                        <Descriptions.Item label="Tuyến đường" span={2}>
                            {selectedTicket.tripId?.routeId?.name || 'Tuyến (không xác định)'}
                        </Descriptions.Item>
                        
                        <Descriptions.Item label="Giờ khởi hành">
                            <span className="text-blue-600 font-bold">
                                {selectedTicket.tripId?.departureTime ? dayjs(selectedTicket.tripId.departureTime).format('HH:mm DD/MM/YYYY') : 'Thời gian (không xác định)'}
                            </span>
                        </Descriptions.Item>
                        <Descriptions.Item label="Biển số xe">
                            {selectedTicket.tripId?.busId?.plateNumber || 'Xe (không xác định)'}
                        </Descriptions.Item>

                        <Descriptions.Item label="Điểm đón" span={2}>
                            <div>
                                <div className="font-bold">{selectedTicket.pickupPoint?.name}</div>
                                <div className="text-xs text-gray-500">{selectedTicket.pickupPoint?.address}</div>
                            </div>
                        </Descriptions.Item>

                        <Descriptions.Item label="Điểm trả" span={2}>
                            <div>
                                <div className="font-bold">{selectedTicket.dropoffPoint?.name}</div>
                                <div className="text-xs text-gray-500">{selectedTicket.dropoffPoint?.address}</div>
                            </div>
                        </Descriptions.Item>

                        <Descriptions.Item label="Số ghế">
                            <Tag color="geekblue">{selectedTicket.seatCodes.join(', ')}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Tổng tiền">
                            <span className="font-bold text-orange-600">{selectedTicket.totalPrice.toLocaleString()} đ</span>
                        </Descriptions.Item>
                        
                        <Descriptions.Item label="Trạng thái">
                            {getStatusTag(selectedTicket.status)}
                        </Descriptions.Item>
                    </Descriptions>
                </div>
            )}
        </Modal>
      </div>
        {reviewTripId && (
          <ReviewModal
            open={openReview}
            tripId={reviewTripId}
            initialData={reviewData} 
            onClose={() => {
              setOpenReview(false);
              setReviewTripId(null);
              setReviewData(null);
              fetchTickets(); 
            }}
          />
      )}
    </div>
  );
}
