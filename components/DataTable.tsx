import React, { useState, useEffect, useMemo } from 'react';
import { Table, Card, Input, Button, Space, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

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
  searchFields?: string[]; // HỖ TRỢ NESTED FIELD

  /** table */
  pagination?: TablePaginationConfig;
  extraButtons?: React.ReactNode;
}

/** Helper: lấy value theo path vd: routeId.name */
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
}: DataTableProps<T>) {
  const [searchText, setSearchText] = useState('');

  /** Filter + Search (memo để tối ưu) */
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
      styles={{ body: { padding: 12 } }}
    >
      {/* TOOLBAR */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
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
            style={{ maxWidth: 320 }}
          />
        )}

        {/* ACTIONS */}
        <Space wrap>
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

      {/* TABLE */}
      <Table
        rowKey={(record) => record._id as string}
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        bordered
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
    </Card>
  );
}

export default DataTable;
