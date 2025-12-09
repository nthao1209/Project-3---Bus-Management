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
        // tùy chọn theme nếu cần
        // algorithm: theme.defaultAlgorithm,
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
