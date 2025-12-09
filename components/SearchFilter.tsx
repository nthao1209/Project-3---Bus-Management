'use client';

import React from 'react';
import { Radio, Checkbox, Slider, Collapse, Rate } from 'antd';

export default function SearchFilter() {
  const panelStyle = {
    background: 'white',
    borderRadius: 8,
    border: 'none',
    marginBottom: 16,
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* 1. Sắp xếp */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h3 className="font-bold text-base mb-3">Sắp xếp</h3>
        <Radio.Group className="flex flex-col gap-2 w-full">
          <Radio value="default">Mặc định</Radio>
          <Radio value="early">Giờ đi sớm nhất</Radio>
          <Radio value="late">Giờ đi muộn nhất</Radio>
          <Radio value="rating">Đánh giá cao nhất</Radio>
          <Radio value="price_asc">Giá tăng dần</Radio>
          <Radio value="price_desc">Giá giảm dần</Radio>
        </Radio.Group>
      </div>

      {/* 2. Các bộ lọc (Dùng Collapse cho đẹp) */}
      <Collapse
        defaultActiveKey={['1', '2']}
        ghost
        expandIconPosition="end"
      >
        <Collapse.Panel header={<span className="font-bold">Giờ đi</span>} key="1" style={{...panelStyle, padding: 0}} className="bg-white shadow-sm !rounded-lg">
           <div className="flex flex-col gap-2 pl-2">
              <Checkbox>Sáng sớm (00:00 - 06:00)</Checkbox>
              <Checkbox>Buổi sáng (06:00 - 12:00)</Checkbox>
              <Checkbox>Buổi chiều (12:00 - 18:00)</Checkbox>
              <Checkbox>Buổi tối (18:00 - 24:00)</Checkbox>
           </div>
        </Collapse.Panel>

        <Collapse.Panel header={<span className="font-bold">Giá vé</span>} key="2" style={panelStyle} className="bg-white shadow-sm !rounded-lg">
           <div className="px-2">
              <Slider range defaultValue={[0, 2000000]} max={2000000} />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                 <span>0đ</span>
                 <span>2.000.000đ+</span>
              </div>
           </div>
        </Collapse.Panel>

        <Collapse.Panel header={<span className="font-bold">Nhà xe</span>} key="3" style={panelStyle} className="bg-white shadow-sm !rounded-lg">
           <div className="flex flex-col gap-2 pl-2">
              <Checkbox>Tân Niên (4.5 <StarFilled className="text-yellow-400 text-xs"/>)</Checkbox>
              <Checkbox>Phương Trang (4.2 <StarFilled className="text-yellow-400 text-xs"/>)</Checkbox>
              <Checkbox>Thành Bưởi</Checkbox>
           </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
}

// Icon sao nhỏ
import { StarFilled } from '@ant-design/icons';