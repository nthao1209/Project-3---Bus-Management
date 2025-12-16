'use client';

import React, { useState } from 'react';
import { Button, message, ConfigProvider } from 'antd';
import { useRouter } from 'next/navigation';
import CompanyModal from '@/components/CompanyModal';

export default function OwnerRegisterPage() {
  const router = useRouter();
  const [openCompanyModal, setOpenCompanyModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCompanySubmit = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/owner-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');

      message.success('Đăng ký nhà xe thành công!');
      setOpenCompanyModal(false);
      router.push('/auth/login');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2474E5] flex items-center justify-center px-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        <div className="text-white space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Tăng 30% lượng khách<br />
            đặt vé khi mở bán online<br />
            trên BusOne ngay hôm nay!
          </h1>
          <p className="text-lg opacity-90">
            Đăng ký miễn phí – chỉ mất 1 phút
          </p>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-center">
            Bắt đầu mở bán vé cùng BusOne
          </h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            Dành cho nhà xe & đối tác vận tải
          </p>

          <ConfigProvider
            theme={{ token: { colorPrimary: '#FFC700' } }}
          >
            <Button
              type="primary"
              block
              className="h-12 text-black font-bold !bg-[#FFC700]"
              onClick={() => setOpenCompanyModal(true)}
            >
              ĐĂNG KÝ MỞ BÁN
            </Button>
          </ConfigProvider>
        </div>
      </div>

      <CompanyModal
        open={openCompanyModal}
        loading={loading}
        onCancel={() => setOpenCompanyModal(false)}
        onSubmit={handleCompanySubmit}
        isLoggedIn={false}
      />
    </div>
  );
}
