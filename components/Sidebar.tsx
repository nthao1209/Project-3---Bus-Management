'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Layout, Menu, Skeleton } from 'antd';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DashboardOutlined,
  CarOutlined,
  UserOutlined,
  ShopOutlined,
  CompassOutlined,
  ScheduleOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

type Role = 'admin' | 'owner' | 'driver' | 'user';

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
): MenuItem {
  return { key, icon, label } as MenuItem;
}

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!res.ok) {
          setRole(null);
          return;
        }

        const data = await res.json();
        setRole(data.role);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  // ✅ MENU CONFIG THEO ROLE
  const menuConfig = [
    // ADMIN
    {
      path: '/admin/dashboard',
      label: 'Tổng quan',
      icon: <DashboardOutlined />,
      roles: ['admin'],
    },
    {
      path: '/admin/companies',
      label: 'Quản lý Nhà xe',
      icon: <ShopOutlined />,
      roles: ['admin'],
    },
    {
      path: '/admin/users',
      label: 'Người dùng',
      icon: <UserOutlined />,
      roles: ['admin'],
    },
    {
      path: '/admin/stations',
      label: 'Quản lý bến xe',
      icon: <CarOutlined />,
      roles: ['admin'],
    },

    // OWNER
    {
      path: '/owner/dashboard',
      label: 'Tổng quan',
      icon: <DashboardOutlined />,
      roles: ['owner'],
    },
    {
      path: '/owner/companies',
      label: 'Quản lý nhà xe',
      icon: <CarOutlined />,
      roles: ['owner'],
    },
     {
      path: '/owner/buses',
      label: 'Quản lý Xe',
      icon: <CarOutlined />,
      roles: ['owner'],
    },
    {
      path: '/owner/routes',
      label: 'Quản lý tuyến đường ',
      icon: <CompassOutlined />,
      roles: ['owner'],
    },
    { 
      path: '/owner/trip-templates', 
      label: 'Cấu hình Lịch biểu', 
      icon: <CalendarOutlined />, 
      roles: ['owner'] 
    },
    {
      path: '/owner/trips',
      label: 'Lịch chạy',
      icon: <ScheduleOutlined />,
      roles: ['owner'],
    },
    {
      path: '/owner/drivers',
      label: ' Quản lý tài xế ',
      icon: <TeamOutlined />,
      roles: ['owner'],
    },
    {
      path: '/owner/bookings',
      label: 'Vé đặt',
      icon: <FileTextOutlined />,
      roles: ['owner'],
    },
  ];

  const items: MenuItem[] = useMemo(() => {
    if (!role) return [];

    return menuConfig
      .filter(item => item.roles.includes(role))
      .map(item =>
        getItem(
          <Link href={item.path}>{item.label}</Link>,
          item.path,
          item.icon
        )
      );
  }, [role]);

  if (loading) {
    return (
      <Sider collapsed={collapsed} theme="dark">
        <div className="p-4">
          <Skeleton active paragraph={{ rows: 6 }} title={false} />
        </div>
      </Sider>
    );
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      theme="dark"
      width={250}
      className="min-h-screen overflow-auto"
    >
      {/* LOGO */}
      <div className="h-16 flex items-center justify-center bg-black/20 m-2 rounded-lg">
        <span className="text-white font-bold text-xl">
          {collapsed ? 'B1' : 'BusOne'}
        </span>
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        items={items}
      />
    </Sider>
  );
};

export default Sidebar;
