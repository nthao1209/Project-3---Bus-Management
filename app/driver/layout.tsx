'use client';
import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import Header from '@/components/Header'
const { Content } = Layout;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (    
      <Layout>
        <Header />
        
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          {children}
        </Content>
      </Layout>
  );
}