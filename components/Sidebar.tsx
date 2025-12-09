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
  FileTextOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const pathname = usePathname(); // Thay thế useLocation
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Lấy Role từ LocalStorage (Client-side only)
  useEffect(() => {
    const storedUser = localStorage.getItem('user_info');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserRole(parsedUser.role || 'user');
    }
    setLoading(false);
  }, []);

  // Cấu hình Menu dựa trên nghiệp vụ Bus Management
  const menuConfig = [
    // --- KHU VỰC CHUNG ---
    { 
      path: userRole === 'admin' ? '/admin/dashboard' : '/owner/dashboard', 
      label: 'Tổng quan', 
      icon: <DashboardOutlined />, 
      roles: ['admin', 'owner'] 
    },

    // --- DÀNH CHO ADMIN HỆ THỐNG ---
    { 
      path: '/admin/companies', 
      label: 'Quản lý Nhà xe', 
      icon: <ShopOutlined />, 
      roles: ['admin'] // Chỉ Admin được duyệt nhà xe
    },
    { 
      path: '/admin/users', 
      label: 'Người dùng', 
      icon: <UserOutlined />, 
      roles: ['admin'] 
    },
    {
      path: '/admin/stations', 
      label: 'Quản lý bến xe', 
      icon: <CarOutlined />, 
      roles: ['admin'] 
    },

    // --- DÀNH CHO OWNER (CHỦ NHÀ XE) ---
    { 
      path: '/owner/buses', 
      label: 'Quản lý Xe', 
      icon: <CarOutlined />, 
      roles: ['owner'] 
    },
    { 
      path: '/owner/routes', 
      label: 'Tuyến đường', 
      icon: <CompassOutlined />, 
      roles: ['owner'] 
    },
    { 
      path: '/owner/trips', 
      label: 'Lịch chạy (Chuyến)', 
      icon: <ScheduleOutlined />, 
      roles: ['owner'] 
    },
    { 
      path: '/owner/drivers', 
      label: 'Tài xế & Phụ xe', 
      icon: <TeamOutlined />, 
      roles: ['owner'] 
    },
    { 
      path: '/owner/bookings', 
      label: 'Quản lý Vé đặt', 
      icon: <FileTextOutlined />, 
      roles: ['owner'] 
    },
  ];

  const items: MenuItem[] = useMemo(() => {
    return menuConfig
      .filter(item => item.roles.includes(userRole))
      .map(item => getItem(
        <Link href={item.path}>{item.label}</Link>, 
        item.path, 
        item.icon
      ));
  }, [userRole]);

  if (loading) {
    return (
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div className="p-4">
            <Skeleton active paragraph={{ rows: 6 }} title={false} />
        </div>
      </Sider>
    );
  }

  return (
    <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="dark"
        width={250}
        className="min-h-screen overflow-auto"
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center bg-black/20 m-2 rounded-lg">
         {collapsed ? (
            <span className="text-white font-bold text-xl">B1</span>
         ) : (
            <span className="text-white font-bold text-xl">BusOne Admin</span>
         )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]} 
        defaultOpenKeys={['/']}
        items={items}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
};

export default Sidebar;