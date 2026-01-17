import React, { useState, useMemo } from 'react';
import { Table, Card, Input, Button, Space, Tooltip, Grid, List } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

const { useBreakpoint } = Grid;

interface DataTableProps<T extends { _id?: string }> {
  title?: React.ReactNode;
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;

  onReload?: () => void;
  onAdd?: () => void;

  searchPlaceholder?: string;
  searchFields?: string[];

  pagination?: TablePaginationConfig;
  extraButtons?: React.ReactNode;

  renderMobileItem?: (item: T) => React.ReactNode; 
}

const getValueByPath = (obj: any, path: string) =>
  path.split('.').reduce((acc, key) => acc?.[key], obj);

function DataTable<T extends { _id?: string }>({
  title,
  columns,
  dataSource,
  loading = false,
  onReload,
  onAdd,
  searchPlaceholder = 'Tìm kiếm...',
  searchFields = [],
  pagination,
  extraButtons,
  renderMobileItem,
}: DataTableProps<T>) {
  const [searchText, setSearchText] = useState('');
 
  const screens = useBreakpoint(); 
  const isMobile = !screens.md; 

  const filteredData = useMemo(() => {
    if (!searchText) return dataSource;
    const keyword = searchText.toLowerCase();
    return dataSource.filter(item =>
      searchFields.some(field => {
        const val = getValueByPath(item, field);
        return String(val ?? '').toLowerCase().includes(keyword);
      })
    );
  }, [dataSource, searchText, searchFields]);

  return (
    <Card
      title={title}
      style={{ marginBottom: 20 }}
      styles={{ body: { padding: isMobile ? 12 : 24 } }}
    >
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {searchFields.length > 0 && (
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 320 }} 
          />
        )}

        <Space wrap style={{ justifyContent: isMobile ? 'flex-end' : 'flex-start', width: isMobile ? '100%' : 'auto' }}>
          {onReload && (
            <Tooltip title="Tải lại">
              <Button icon={<ReloadOutlined />} onClick={onReload} />
            </Tooltip>
          )}

          {onAdd && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              Thêm mới
            </Button>
          )}

          {extraButtons}
        </Space>
      </div>

      {isMobile && renderMobileItem ? (
        <List
          loading={loading}
          dataSource={filteredData}
          pagination={{
            simple: true,
            position: 'bottom', 
          }}

          renderItem={(item) => (
            <div style={{ marginBottom: 12 }}>
               {renderMobileItem(item)}
            </div>
          )}
        />
      ) : (
        <Table
          rowKey={(record) => record._id as string}
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          bordered
          size={isMobile ? 'small' : 'middle'} 
          scroll={{ x: 900 }}
          pagination={
            pagination ?? {
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20'],
              size: 'small',
            }
          }
        />
      )}
    </Card>
  );
}

export default DataTable;