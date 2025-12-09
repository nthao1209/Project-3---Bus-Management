import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AntdProvider from '@/components/AntdProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BusOne - Đặt vé xe khách, xe limousine giá rẻ',
  description: 'Hệ thống đặt vé xe trực tuyến lớn nhất Việt Nam',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AntdRegistry>
          <AntdProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow bg-[#f2f2f2]">
                {children}
              </main>
            </div>
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
