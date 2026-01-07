'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Result, Button, Spin, Card } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';

function PaymentResult() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    // Lấy ResponseCode từ URL
    const responseCode = searchParams.get('vnp_ResponseCode');
    
    // "00" là thành công
    if (responseCode === '00') {
      setStatus('success');
    } else {
      setStatus('failed');
    }
    
    // Lưu ý: Ở đây chỉ hiển thị UI. Việc cập nhật DB an toàn nhất là ở API IPN.
    // Tuy nhiên, để UX tốt hơn, bạn có thể gọi nhẹ 1 API check status booking 
    // từ DB để đảm bảo chắc chắn.
  }, [searchParams]);

  if (status === 'loading') return <div className="h-screen flex justify-center items-center"><Spin size="large" /></div>;

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