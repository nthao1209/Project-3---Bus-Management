'use client';

import { Modal, Rate, Input, message } from 'antd';
import { useState, useEffect } from 'react';

export default function ReviewModal({
  open,
  tripId,
  initialData,
  onClose,
}: {
  open: boolean;
  tripId: string;
  initialData?: { rating: number; comment: string };
  onClose: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

   useEffect(() => {
    if (initialData) {
        setRating(initialData.rating);
        setComment(initialData.comment || '');
    } else {
        setRating(5);
        setComment('');
    }
  }, [initialData, open]);

  const submitReview = async () => {

     if (initialData) {
        onClose();
        return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/users/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, rating, comment }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      message.success('Cảm ơn bạn đã đánh giá!');
      onClose(); 
      setComment('');
      setRating(5);
    } catch (err: any) {
      message.error(err.message || 'Lỗi gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = !!initialData; // Chế độ chỉ đọc
  return (
    <Modal
      open={open}
      title={isReadOnly ? "Đánh giá của bạn" : "Đánh giá chuyến đi"}
      onOk={submitReview}
      confirmLoading={loading}
      onCancel={onClose}
      okText={isReadOnly ? "Đóng" : "Gửi đánh giá"}
      cancelButtonProps={{ style: { display: isReadOnly ? 'none' : 'inline-block' } }} // Ẩn nút Cancel khi xem lại
    >
      <div className="flex flex-col items-center mb-4">
        <Rate value={rating} onChange={setRating} disabled={isReadOnly} style={{ fontSize: 32 }} />
      </div>
      <Input.TextArea
        rows={4}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        readOnly={isReadOnly} // Không cho sửa text
        placeholder={isReadOnly ? "(Không có nhận xét)" : "Chia sẻ trải nghiệm..."}
      />
    </Modal>
  );
}