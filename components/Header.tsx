'use client';

import React, { useEffect, useState } from 'react';
import {
  Button,
  Dropdown,
  Avatar,
  MenuProps,
  message,
  Tooltip,
  Image,
} from 'antd';
import {
  QuestionCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  ProfileOutlined,
  HistoryOutlined,
  ShopOutlined,
  MenuOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ================= TYPES ================= */
type Role = 'user' | 'owner' | 'driver' | 'admin';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

/* ================= ROLE LABEL ================= */
const roleLabelMap: Record<Role, string> = {
  user: 'Khách hàng',
  owner: 'Chủ nhà xe',
  driver: 'Tài xế',
  admin: 'Quản trị viên',
};

/* ================= UI CONFIG ================= */
const roleUI = {
  user: {
    showMyTickets: true,
    showProfile: true,
    showOwnerRegister: true,
    dashboard: null,
  },
  owner: {
    showMyTickets: false,
    showProfile: true,
    showOwnerRegister: false,
  },
  driver: {
    showMyTickets: false,
    showProfile: false,
    showOwnerRegister: false,
  },
  admin: {
    showMyTickets: false,
    showProfile: false,
    showOwnerRegister: false,
  },
};

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  const currentUI = user ? roleUI[user.role] : null;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        setUser(data);
      } catch {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      message.success('Đã đăng xuất');
      router.push('/auth/login');
    } catch {
      message.error('Đăng xuất thất bại');
    }
  };

  /* ================= USER MENU ================= */
  const userMenu: MenuProps['items'] = [
  {
    key: 'info',
    label: (
      <div className="flex flex-col">
        <span className="font-bold text-blue-700">{user?.name}</span>
        <span className="text-xs text-gray-500">
          {user && roleLabelMap[user.role]}
        </span>
      </div>
    ),
    icon: <UserOutlined />,
  },
  { type: 'divider' as const },

  ...(currentUI?.showProfile
    ? [
        {
          key: 'profile',
          label: <Link href="/auth/profile">Thông tin tài khoản</Link>,
          icon: <ProfileOutlined />,
        },
        { type: 'divider' as const },
      ]
    : []),

  {
    key: 'logout',
    label: <span onClick={handleLogout}>Đăng xuất</span>,
    icon: <LogoutOutlined />,
    danger: true,
  },
];


  /* ================= MOBILE MENU ================= */
  const mobileMenu: MenuProps['items'] = [

    ...(currentUI?.showMyTickets
      ? [
          {
            key: 'my-tickets',
            label: <Link href="/my-tickets">Đơn hàng của tôi</Link>,
            icon: <HistoryOutlined />,
          },
        ]
      : []),
  ];

  /* ================= RENDER ================= */
  return (
    <header className="w-full bg-[#2474E5] text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 h-[60px] flex items-center justify-between">
        {/* LOGO */}
        <Link href="/">
          <Image src="/Logo.png" alt="Logo" height={42} preview={false} />
        </Link>

        {/* TEXT */}
        <div className="hidden lg:flex items-center text-[13px] opacity-90">
          <span>Cam kết hoàn 150% nếu nhà xe không cung cấp dịch vụ (*)</span>
          <QuestionCircleOutlined className="ml-2 cursor-pointer" />
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {currentUI?.showMyTickets && (
            <Link href="/my-tickets" className="hidden md:block">
              Đơn hàng của tôi
            </Link>
          )}

          {currentUI?.showOwnerRegister && (
            <Link href="/auth/owner-register" className="hidden lg:block font-semibold">
              Mở bán vé trên BusOne
            </Link>
          )}

          <Dropdown
            menu={{ items: mobileMenu }}
            placement="bottomRight"
          >
            <Button type="text" icon={<MenuOutlined />} className="lg:hidden" />
          </Dropdown>

          {user ? (
            <Dropdown menu={{ items: userMenu }} placement="bottomRight">
              <Avatar className="bg-yellow-400 text-blue-700 font-bold cursor-pointer">
                {user.email.charAt(0).toUpperCase()}
              </Avatar>
            </Dropdown>
          ) : (
            <Link href="/auth/login">
              <Button className="!bg-white !text-[#2474E5] font-bold">
                Đăng nhập
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
