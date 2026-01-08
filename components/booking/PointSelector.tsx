import React from 'react';
import { Card, Radio, Tag, Typography } from 'antd';
import dayjs from 'dayjs';

interface Point {
  _id: string;
  name: string;
  address: string;
  time: string; 
  surcharge?: number;
}

interface PointSelectorProps {
  title: React.ReactNode;
  points: Point[];
  selectedId?: string;
  onSelect: (point: Point) => void;
  iconClass?: string;
  timeClass?: string;
}

export default function PointSelector({ 
  title, points, selectedId, onSelect, timeClass = "text-blue-600" 
}: PointSelectorProps) {

  const formatTime = (isoString: string) => isoString ? dayjs(isoString).format('HH:mm') : '--:--';

  return (
    <Card title={title} size="small">
      {points?.length > 0 ? (
        <Radio.Group 
          className="w-full flex flex-col gap-2" 
          value={selectedId}
          onChange={(e) => {
            const point = points.find(p => p._id === e.target.value);
            if(point) onSelect(point);
          }}
        >
          {points.map((p) => (
            <Radio key={p._id} value={p._id} className="w-full border p-2 rounded hover:bg-gray-50">
              <div className="flex justify-between w-full">
                <span>
                  <span className={`font-bold mr-2 ${timeClass}`}>{formatTime(p.time)}</span>
                  {p.name}
                </span>
                {p.surcharge && p.surcharge > 0 ? (
                    <Tag color="orange">+{p.surcharge.toLocaleString()}</Tag>
                ) : null}
              </div>
              <div className="text-xs text-gray-400 ml-6 truncate" title={p.address}>{p.address}</div>
            </Radio>
          ))}
        </Radio.Group>
      ) : <Typography.Text type="secondary">Không có thông tin</Typography.Text>}
    </Card>
  );
}