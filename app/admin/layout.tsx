'use client';
import React, { useState } from 'react';
import { Layout, Button, theme } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Sidebar from '@/components/Sidebar'; // Import component vừa tạo
const { Header, Content } = Layout;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout className="min-h-screen">
      {/* Sidebar nằm bên trái */}
      <Sidebar collapsed={collapsed} />
      
      <Layout>
        {/* Header chứa nút Toggle Sidebar */}
        <Header style={{ padding: 0, background: colorBgContainer }} className="flex items-center px-4 shadow-sm">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <span className="font-semibold text-lg ml-2">Hệ thống quản lý</span>
        </Header>
        
        {/* Nội dung chính thay đổi theo page */}
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}