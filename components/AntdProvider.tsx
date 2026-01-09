'use client';

import { App, ConfigProvider } from 'antd';
import React from 'react';

export default function AntdProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      theme={{
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
