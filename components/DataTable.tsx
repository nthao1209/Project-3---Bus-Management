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

  /** actions */
  onReload?: () => void;
  onAdd?: () => void;

  /** search */
  searchPlaceholder?: string;
  searchFields?: string[];

  /** table */
  pagination?: TablePaginationConfig;
  extraButtons?: React.ReactNode;

  /** MOBILE: Hàm render giao diện Card cho mobile */
  renderMobileItem?: (item: T) => React.ReactNode; 
}

/** Helper: lấy value theo path */
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
  renderMobileItem, // Prop mới để render giao diện mobile
}: DataTableProps<T>) {
  const [searchText, setSearchText] = useState('');
  
  // Hook kiểm tra kích thước màn hình của Antd
  // md = true nghĩa là màn hình > 768px (Desktop/Tablet)
  const screens = useBreakpoint(); 
  const isMobile = !screens.md; 

  /** Filter + Search */
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
      styles={{ body: { padding: isMobile ? 12 : 24 } }} // Padding nhỏ hơn trên mobile
    >
      {/* TOOLBAR */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          // Mobile thì xếp dọc (column), Desktop thì xếp ngang (row)
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* SEARCH */}
        {searchFields.length > 0 && (
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={searchPlaceholder}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            // Mobile thì full width 100%
            style={{ width: isMobile ? '100%' : 320 }} 
          />
        )}

        {/* ACTIONS */}
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

      {/* --- PHẦN QUAN TRỌNG: CHUYỂN ĐỔI TABLE <-> LIST --- */}
      {isMobile && renderMobileItem ? (
        /* GIAO DIỆN MOBILE (Dạng thẻ) */
        <List
          loading={loading}
          dataSource={filteredData}
          pagination={pagination ? { ...pagination, simple: true ,position:'bottom'} : false}
          renderItem={(item) => (
            <div style={{ marginBottom: 12 }}>
               {renderMobileItem(item)}
            </div>
          )}
        />
      ) : (
        /* GIAO DIỆN DESKTOP (Dạng bảng cũ) */
        <Table
          rowKey={(record) => record._id as string}
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          bordered
          size={isMobile ? 'small' : 'middle'} // Thu nhỏ size bảng nếu ko có renderMobileItem
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