import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Button, Space, Tooltip, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface DataTableProps<T> {
  title: React.ReactNode;
  columns: ColumnsType<T>;
  dataSource: T[];
  loading: boolean;
  onReload: () => void;
  onAdd?: () => void;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  extraButtons?: React.ReactNode;
}

function DataTable<T extends object>({
  title, columns, dataSource, loading, onReload, onAdd,
  searchPlaceholder = "Tìm kiếm...", searchFields = [], extraButtons
}: DataTableProps<T>) {
  
  const [filteredData, setFilteredData] = useState<T[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    // Sắp xếp dataSource theo id tăng dần trước khi setFilteredData
    const sortedData = [...dataSource].sort((a: any, b: any) => (a.id || 0) - (b.id || 0));

    setFilteredData(sortedData);

    if (searchText) handleSearch(searchText);
  }, [dataSource]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    const lowerVal = value.toLowerCase();
    if (!value) { setFilteredData(dataSource); return; }

    const filtered = dataSource.filter((item) => {
      return searchFields.some((key) => {
        const fieldVal = item[key];
        return String(fieldVal || '').toLowerCase().includes(lowerVal);
      });
    });
    setFilteredData(filtered);
  };

  return (
    <Card
      title={title}
      style={{ marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      styles={{ body: { padding: '12px' } }}
    >
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        {searchFields.length > 0 && (
          <Input
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 300 }} // Max width trên PC
            allowClear
          />
        )}
        
        <Space wrap>
          <Tooltip title="Tải lại">
            <Button icon={<ReloadOutlined />} onClick={onReload} />
          </Tooltip>
          {onAdd && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              Thêm mới
            </Button>
          )}
          {extraButtons}
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        bordered
        scroll={{ x: 900 }} 
        
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20'],
          showTotal: (total, range) => <span className="hidden sm:inline">{`${range[0]}-${range[1]}/${total}`}</span>,
          size: "small" 
        }}
      />
    </Card>
  );
}

export default DataTable;