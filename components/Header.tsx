'use client';

import React, { useEffect, useState } from 'react';
import { Button, Dropdown, Avatar, MenuProps, message,Tooltip,Image } from 'antd';
import {
  PhoneFilled,
  QuestionCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  ProfileOutlined,
  HistoryOutlined,
  ShopOutlined,
  MenuOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const storedUser = localStorage.getItem('user_info');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Đăng xuất thất bại');
      }
      localStorage.removeItem('user_info');
      setUser(null);
      message.success('Đã đăng xuất thành công');
      router.push('/auth/login');
    } catch (error) {
      console.error(error);
      message.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  const mobileMenu: MenuProps['items'] = [
    {
      key: 'my-tickets',
      label: <Link href="/my-tickets">Đơn hàng của tôi</Link>,
      icon: <HistoryOutlined />,
    },
    {
      key: 'owner-register',
      label: <Link href="/owner/register">Mở bán vé trên BusOne</Link>,
      icon: <ShopOutlined />,
    },
  ]

  const userMenu: MenuProps['items'] = [
    {
      key: '1',
      label: (
        <div className="flex flex-col">
           <span className="font-bold text-blue-700">{user?.name}</span>
           <span className="text-xs text-gray-500">{user?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</span>
        </div>
      ),
      icon: <UserOutlined />,
    },
    { type: 'divider' },
    {
      key: '2',
      label: <Link href="/auth/profile">Thông tin tài khoản</Link>,
      icon: <ProfileOutlined />,
    },
    {
      key: '3',
      label: <Link href="/my-tickets">Vé của tôi</Link>,
      icon: <HistoryOutlined />,
    },
    { type: 'divider' },
    {
      key: '4',
      label: <span onClick={handleLogout}>Đăng xuất</span>,
      icon: <LogoutOutlined />,
      danger: true, 
    },
  ];

  return (
    <header className="w-full bg-[#2474E5] text-white font-sans shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-[60px] flex items-center justify-between">
        
        <div className="flex items-center gap-4">
          <Link href="/">
          <span className="flex items-center gap-2 group">
            <Image
              src="/Logo.png"
              alt="Logo"
              height={42}
              preview={false}
              style={{ objectFit: "contain", width: "auto" }}
            />
          </span>
        </Link>


          <div className="hidden lg:flex items-center text-[13px] font-medium opacity-90">
            <div className="h-6 w-[1px] bg-white/30 mx-3"></div>
            <span>Cam kết hoàn 150% nếu nhà xe không cung cấp dịch vụ (*)</span>
            <QuestionCircleOutlined className="ml-1 cursor-pointer hover:opacity-80" />
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6 text-[14px] font-medium">
          <Link href="/my-tickets" className="hidden md:block hover:text-yellow-200 transition">Đơn hàng của tôi</Link>
          <Link href="/owner/register" className="hidden lg:block hover:text-yellow-200 transition font-semibold"> Mở bán vé trên BusOne </Link>
          <div className="lg:hidden flex items-center">
            <Dropdown menu={{ items: mobileMenu }} trigger={['click']} placement="bottomRight" arrow>
              <Button 
                type="text" 
                icon={<MenuOutlined className="text-white text-xl" />} 
                className="flex items-center justify-center !text-white hover:!bg-white/20"
              />
            </Dropdown>
          </div>
          {user ? (
            <Dropdown menu={{ items: userMenu }} placement="bottomRight" arrow trigger={['click']}>
              <div className="flex items-center gap-2 cursor-pointer hover:bg-blue-600 p-1.5 rounded-full transition select-none">
                <Tooltip title={user.name}>
                  <Avatar 
                    className="bg-yellow-400 text-blue-700 font-bold cursor-pointer" >
                          {user.name?.charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>
              </div>
            </Dropdown>
          ) : (
            <Link href="/auth/login">
              <Button type="default" className="!bg-white !text-[#2474E5] !border-none !font-bold hover:!bg-gray-100 shadow-sm">
                Đăng nhập
              </Button>
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}