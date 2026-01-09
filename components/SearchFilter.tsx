'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Checkbox, Slider, Collapse, Tag } from 'antd';
import { StarFilled } from '@ant-design/icons';

// Định nghĩa kiểu dữ liệu cho State của bộ lọc
export interface FilterState {
  sortBy: string;
  timeRanges: string[];
  priceRange: [number, number];
  selectedOperators: string[];
}

// Định nghĩa Props nhận vào
interface SearchFilterProps {
  maxPrice?: number; // Giá cao nhất tìm thấy trong danh sách
  operators?: { name: string; count: number; rating: number }[]; // Danh sách nhà xe
  onFilterChange: (filters: FilterState) => void; // Hàm gửi dữ liệu ra ngoài
}

export default function SearchFilter({ 
  maxPrice = 2000000, 
  operators = [], 
  onFilterChange 
}: SearchFilterProps) {
  
  // --- STATE ---
  const [sortBy, setSortBy] = useState('default');
  const [timeRanges, setTimeRanges] = useState<string[]>([]);
  // Mặc định slider chạy từ 0 đến giá cao nhất tìm thấy
  const [priceRange, setPriceRange] = useState<[number, number]>([0, maxPrice]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);

  // Khi danh sách chuyến xe thay đổi (maxPrice thay đổi), reset lại max của Slider
  useEffect(() => {
    if (maxPrice > 0) {
        setPriceRange([0, maxPrice]);
    }
  }, [maxPrice]);

  // --- EFFECT: Gửi dữ liệu lọc ra component cha mỗi khi người dùng thao tác ---
  useEffect(() => {
    onFilterChange({
      sortBy,
      timeRanges,
      priceRange,
      selectedOperators
    });
  }, [sortBy, timeRanges, priceRange, selectedOperators, onFilterChange]);

  // Format tiền tệ VNĐ
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  const panelStyle = {
    background: 'white',
    borderRadius: 8,
    border: 'none',
    marginBottom: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* 1. SẮP XẾP */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h3 className="font-bold text-base mb-3 text-gray-800">Sắp xếp</h3>
        <Radio.Group 
            className="flex flex-col gap-2 w-full" 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
        >
          <Radio value="default">Mặc định</Radio>
          <Radio value="early">Giờ đi sớm nhất</Radio>
          <Radio value="late">Giờ đi muộn nhất</Radio>
          <Radio value="price_asc">Giá tăng dần</Radio>
          <Radio value="price_desc">Giá giảm dần</Radio>
        </Radio.Group>
      </div>

      {/* 2. BỘ LỌC CHI TIẾT */}
      <Collapse
        defaultActiveKey={['1', '2', '3']}
        ghost
        expandIconPosition="end"
        className="site-collapse-custom-collapse"
      >
        {/* LỌC THEO GIỜ */}
        <Collapse.Panel header={<span className="font-bold text-gray-800">Giờ đi</span>} key="1" style={{...panelStyle, padding: 0}} className="bg-white shadow-sm !rounded-lg">
           <Checkbox.Group 
              className="flex flex-col gap-2 pl-2 w-full" 
              value={timeRanges}
              onChange={(vals) => setTimeRanges(vals as string[])}
           >
              <Checkbox value="0-6">Sáng sớm (00:00 - 06:00)</Checkbox>
              <Checkbox value="6-12">Buổi sáng (06:00 - 12:00)</Checkbox>
              <Checkbox value="12-18">Buổi chiều (12:00 - 18:00)</Checkbox>
              <Checkbox value="18-24">Buổi tối (18:00 - 24:00)</Checkbox>
           </Checkbox.Group>
        </Collapse.Panel>

        {/* LỌC THEO GIÁ */}
        <Collapse.Panel header={<span className="font-bold text-gray-800">Giá vé</span>} key="2" style={panelStyle} className="bg-white shadow-sm !rounded-lg">
           <div className="px-2 pb-2">
              <Slider 
                range 
                min={0}
                max={maxPrice > 0 ? maxPrice : 1000000} // Fallback nếu chưa có dữ liệu
                step={10000}
                value={priceRange} 
                onChange={(val) => setPriceRange(val as [number, number])}
                trackStyle={[{ backgroundColor: '#2474E5' }]}
                handleStyle={[{ borderColor: '#2474E5' }, { borderColor: '#2474E5' }]}
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2 font-medium">
                 <span>{formatCurrency(priceRange[0])}</span>
                 <span>{formatCurrency(priceRange[1])}</span>
              </div>
           </div>
        </Collapse.Panel>

        <Collapse.Panel header={<span className="font-bold text-gray-800">Nhà xe</span>} key="3" style={panelStyle} className="bg-white shadow-sm !rounded-lg">
           {operators.length === 0 ? (
               <div className="pl-2 text-gray-400 text-sm italic">Đang tải danh sách...</div>
           ) : (
               <Checkbox.Group 
                  className="flex flex-col gap-3 pl-2 w-full"
                  value={selectedOperators}
                  onChange={(vals) => setSelectedOperators(vals as string[])}
               >
                  {operators.map((op, index) => (
                      <Checkbox key={index} value={op.name} className="!ml-0 flex items-center w-full">
                          <div className="flex justify-between w-full items-center pr-2">
                              <span className="text-gray-700">{op.name}</span>
                              <div className="flex items-center gap-1">
                                  <span className="text-xs bg-gray-100 px-1 rounded text-gray-500">{op.count}</span>
                              </div>
                          </div>
                      </Checkbox>
                  ))}
               </Checkbox.Group>
           )}
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}