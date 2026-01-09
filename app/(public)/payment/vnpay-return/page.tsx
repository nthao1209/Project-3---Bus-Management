'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Result, Button, Spin, Card } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, ClockCircleOutlined } from '@ant-design/icons';

function PaymentResult() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const processPayment = async () => {
      const responseCode = searchParams.get('vnp_ResponseCode');
      const txnRef = searchParams.get('vnp_TxnRef');
      
      if (!txnRef) {
        setStatus('failed');
        return;
      }

      if (responseCode === '00') {
        // ✅ Gọi API verify và xử lý payment trực tiếp (không cần đợi IPN)
        try {
          // Tạo query string từ tất cả params
          const params = new URLSearchParams();
          searchParams.forEach((value, key) => {
            params.append(key, value);
          });
          
          // Gọi verify endpoint
          const res = await fetch(`/api/payment/vnpay-verify?${params.toString()}`);
          const data = await res.json();
          
          if (data.success && data.verified) {
            setStatus('success');
          } else {
            setStatus('failed');
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          setStatus('failed');
        }
      } else {
        // Thanh toán thất bại hoặc user hủy
        setStatus('failed');
      }
    };
    
    processPayment();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="h-screen flex justify-center items-center">
        <Spin size="large" tip="Đang xác nhận thanh toán..." />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-4">
        <Result
          status="success"
          icon={<CheckCircleFilled className="text-green-500" />}
          title="Thanh toán thành công!"
          subTitle="Vé của bạn đã được xác nhận. Vui lòng kiểm tra email."
          extra={[
            <Button type="primary" key="console" onClick={() => router.push('/my-tickets')}>
              Xem vé của tôi
            </Button>,
            <Button key="buy" onClick={() => router.push('/')}>
              Về trang chủ
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4">
      <Result
        status="error"
        icon={<CloseCircleFilled className="text-red-500" />}
        title="Thanh toán thất bại"
        subTitle="Có lỗi xảy ra trong quá trình thanh toán hoặc bạn đã hủy giao dịch."
        extra={[
          <Button type="primary" key="retry" onClick={() => router.back()}>
            Thử lại
          </Button>,
          <Button key="home" onClick={() => router.push('/')}>
            Về trang chủ
          </Button>,
        ]}
      />
    </div>
  );
}

export default function VnpayReturnPage() {
    return (
        <Suspense fallback={<Spin />}>
            <PaymentResult />
        </Suspense>
    )
}
