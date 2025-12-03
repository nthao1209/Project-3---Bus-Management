'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FacebookFilled, 
  YoutubeFilled, 
  InstagramFilled,
  PhoneFilled,
  MailFilled,
  EnvironmentFilled,
  SafetyCertificateFilled
} from '@ant-design/icons';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-12 pb-8 font-sans text-gray-600">
      <div className="container mx-auto px-4">
        
        {/* --- GRID 4 CỘT --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Cột 1: Thông tin công ty */}
          <div>
            <h3 className="text-lg font-bold text-blue-700 mb-4 uppercase tracking-wide">
              Về Chúng Tôi
            </h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-blue-600 transition">Giới thiệu về nhà xe</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition">Tin tức & Sự kiện</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition">Mạng lưới văn phòng</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition">Tuyển dụng</Link></li>
            </ul>
          </div>

          {/* Cột 2: Hỗ trợ khách hàng */}
          <div>
            <h3 className="text-lg font-bold text-blue-700 mb-4 uppercase tracking-wide">
              Hỗ Trợ
            </h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="#" className="hover:text-blue-600 transition">Hướng dẫn đặt vé</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition">Chính sách bảo mật</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition">Câu hỏi thường gặp (FAQ)</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition">Khiếu nại & Góp ý</Link></li>
            </ul>
          </div>

          {/* Cột 3: Thanh toán & Chứng nhận */}
          <div>
            <h3 className="text-lg font-bold text-blue-700 mb-4 uppercase tracking-wide">
              Thanh Toán
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {['Visa', 'MasterCard', 'MoMo', 'ZaloPay', 'Internet Banking'].map((item) => (
                <span key={item} className="px-2 py-1 border rounded bg-gray-50 text-xs font-semibold text-gray-500 cursor-default">
                  {item}
                </span>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
              <SafetyCertificateFilled className="text-xl" />
              <span>Đã đăng ký bộ công thương</span>
            </div>
          </div>

          {/* Cột 4: Liên hệ */}
          <div>
            <h3 className="text-lg font-bold text-blue-700 mb-4 uppercase tracking-wide">
              Liên Hệ
            </h3>
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2">
                <EnvironmentFilled className="mt-1 text-blue-500" />
                <span>Tầng 3, Tòa nhà ABC, 123 Đường Láng, Hà Nội</span>
              </p>
              <p className="flex items-center gap-2">
                <PhoneFilled className="text-blue-500" />
                <a href="tel:19001234" className="hover:text-blue-600 font-bold">1900 1234</a>
              </p>
              <p className="flex items-center gap-2">
                <MailFilled className="text-blue-500" />
                <a href="mailto:support@vexere.com" className="hover:text-blue-600">support@busone.com</a>
              </p>
            </div>

            {/* Social Icons */}
            <div className="mt-6 flex gap-4">
              <Link href="#" className="text-gray-400 hover:text-blue-600 text-2xl transition"><FacebookFilled /></Link>
              <Link href="#" className="text-gray-400 hover:text-red-600 text-2xl transition"><YoutubeFilled /></Link>
              <Link href="#" className="text-gray-400 hover:text-pink-600 text-2xl transition"><InstagramFilled /></Link>
            </div>
          </div>
        </div>

        {/* --- DÒNG KẺ NGANG & COPYRIGHT --- */}
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-500">
          <p className="mb-2">Công ty TNHH Thương Mại Dịch Vụ BusOne</p>
          <p>Copyright © 2024 - Bản quyền thuộc về Dự án của bạn.</p>
        </div>
      </div>
    </footer>
  );
}