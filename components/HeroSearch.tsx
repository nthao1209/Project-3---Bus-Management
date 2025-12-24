'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ConfigProvider, Select, DatePicker, Button, Tabs, message, Spin 
} from 'antd';
import { 
  SwapOutlined, EnvironmentFilled, CalendarFilled, CarOutlined, PlusOutlined, 
  SafetyCertificateFilled, PhoneFilled, TagFilled, CreditCardFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import locale from 'antd/locale/vi_VN'; 
import 'dayjs/locale/vi'; 

const removeAccents = (str: string) => 
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

const themeConfig = {
  token: { colorPrimary: '#2474E5', borderRadius: 8 },
  components: {
    Button: { colorPrimary: '#FFC700', colorPrimaryHover: '#e0b000', colorPrimaryActive: '#d0a000', colorTextLightSolid: '#000000' },
    Tabs: { itemSelectedColor: '#2474E5', inkBarColor: '#2474E5', itemActiveColor: '#2474E5', titleFontSizeLG: 16 },
    Select: { controlHeight: 40 }
  },
};

export default function HeroSearch({ isCompact = false }: { isCompact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [provinceOptions, setProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // State Form
  const [fromProvince, setFromProvince] = useState<string | null>(null);
  const [toProvince, setToProvince] = useState<string | null>(null);
  const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [returnDate, setReturnDate] = useState<dayjs.Dayjs | null>(null);

  // 1. Fetch danh sách Tỉnh/Thành từ API Stations đã có
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingData(true);
      try {
        const res = await fetch('/api/owner/stations?status=active'); 
        const data = await res.json();
        
        if (data.success && Array.isArray(data.data)) {
          const uniqueProvinces = Array.from(new Set(data.data.map((station: any) => station.province)));
          
          const options = uniqueProvinces
            .sort((a: any, b: any) => a.localeCompare(b))
            .map((prov: any) => ({ value: prov, label: prov }));
            
          setProvinceOptions(options);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu tỉnh thành:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchProvinces();
  }, []);

  // 2. Sync URL params vào Form khi load trang (giữ trạng thái khi refresh)
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const d = searchParams.get('date');
    const rd = searchParams.get('returnDate');

    if (from) setFromProvince(from);
    if (to) setToProvince(to);
    if (d) setDate(dayjs(d));
    if (rd) setReturnDate(dayjs(rd));
  }, [searchParams]);

  const handleSwap = () => {
    setFromProvince(toProvince);
    setToProvince(fromProvince);
  };

  const handleSearch = () => {
    if (!fromProvince || !toProvince) {
      message.warning('Vui lòng chọn nơi đi và nơi đến!');
      return;
    }
    
    // Tạo URL query string
    const params = new URLSearchParams();
    params.set('from', fromProvince);
    params.set('to', toProvince);
    if (date) params.set('date', date.format('YYYY-MM-DD'));
    if (returnDate) params.set('returnDate', returnDate.format('YYYY-MM-DD'));

    // Chuyển hướng sang trang tìm kiếm
    router.push(`/search?${params.toString()}`);
  };

  const filterOption = (input: string, option?: { label: string; value: string }) => {
    return removeAccents(option?.label ?? '').includes(removeAccents(input));
  };

  const tabItems = [{ label: <span className="flex items-center gap-2 font-semibold"><CarOutlined /> Xe khách</span>, key: 'bus' }];

  const containerClasses = isCompact 
    ? "relative w-full bg-white shadow-sm border-b border-gray-200 py-4" 
    : "absolute top-[150px] md:top-[180px] left-1/2 transform -translate-x-1/2 w-[95%] max-w-6xl z-20";

  const wrapperClasses = isCompact
    ? "container mx-auto"
    : "bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden";

  return (
    <ConfigProvider theme={themeConfig} locale={locale}>
      <div className={isCompact ? "sticky top-0 z-40" : "relative w-full mb-20"}>
        
        {!isCompact && (
          <div 
            className="w-full h-[450px] md:h-[500px] bg-cover bg-center bg-no-repeat relative flex flex-col items-center pt-8 md:pt-16"
            style={{ backgroundColor: '#dceeff', backgroundImage: "url('https://static.vexere.com/production/banners/993/banner-home-tet-2025.png')" }}
          >
          </div>
        )}

        <div className={containerClasses}>
            <div className={wrapperClasses}>
                
                {!isCompact && (
                   <div className="px-6 pt-2 border-b border-gray-100">
                      <Tabs defaultActiveKey="bus" items={tabItems} size="large" className="font-bold" />
                   </div>
                )}

                <div className={`p-4 md:p-5 flex flex-col ${isCompact ? 'lg:flex-row items-end' : 'lg:flex-row'} gap-4`}>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-0 relative">
                        {/* Nơi đi */}
                        <div className="border border-gray-300 rounded-lg lg:rounded-r-none p-2 hover:border-blue-500 transition bg-white h-[50px] md:h-[64px] flex flex-col justify-center relative z-10">
                            <span className="text-xs text-gray-500 font-medium ml-3">Nơi xuất phát</span>
                            <Select
                                showSearch
                                variant="borderless"
                                value={fromProvince}
                                onChange={setFromProvince}
                                options={provinceOptions} 
                                loading={loadingData}
                                placeholder={loadingData ? "Đang tải..." : "Chọn tỉnh/thành"}
                                className="w-full text-base font-bold"
                                suffixIcon={<EnvironmentFilled className="text-blue-500" />}
                                filterOption={filterOption} 
                                notFoundContent="Không tìm thấy địa điểm"
                            />
                        </div>

                        {/* Nút Swap */}
                        <div className="hidden lg:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                             <Button shape="circle" icon={<SwapOutlined />} onClick={handleSwap} className="shadow-sm text-blue-600 bg-white" />
                        </div>
                         <div className="flex lg:hidden justify-center -my-2 z-20">
                             <Button shape="circle" icon={<SwapOutlined className="rotate-90" />} onClick={handleSwap} />
                        </div>

                        {/* Nơi đến */}
                        <div className="border border-gray-300 rounded-lg lg:rounded-l-none lg:border-l-0 p-2 hover:border-blue-500 transition bg-white h-[50px] md:h-[64px] flex flex-col justify-center relative z-10">
                            <span className="text-xs text-gray-500 font-medium ml-3">Nơi đến</span>
                            <Select
                                showSearch
                                variant="borderless"
                                value={toProvince}
                                onChange={setToProvince}
                                options={provinceOptions} // Dùng dữ liệu từ API
                                loading={loadingData}
                                placeholder={loadingData ? "Đang tải..." : "Chọn tỉnh/thành"}
                                className="w-full text-base font-bold"
                                suffixIcon={<EnvironmentFilled className="text-red-500" />}
                                filterOption={filterOption}
                                notFoundContent="Không tìm thấy địa điểm"
                            />
                        </div>
                    </div>

                    {/* --- GROUP 2: NGÀY ĐI & NGÀY VỀ --- */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr] gap-4">
                        <div className="border border-gray-300 rounded-lg p-2 hover:border-blue-500 transition bg-white h-[50px] md:h-[64px] flex flex-col justify-center">
                            <span className="text-xs text-gray-500 font-medium ml-3">Ngày đi</span>
                            <DatePicker 
                                value={date}
                                onChange={setDate}
                                format="DD/MM/YYYY"
                                variant="borderless"
                                allowClear={false}
                                className="w-full text-base font-bold p-0 pl-3"
                                suffixIcon={<CalendarFilled className="text-blue-500" />}
                                disabledDate={(current) => current && current < dayjs().startOf('day')} // Không chọn ngày quá khứ
                            />
                        </div>

                        <div 
                            className={`border ${returnDate ? 'border-blue-500' : 'border-gray-300'} rounded-lg p-2 hover:border-blue-500 transition bg-white h-[50px] md:h-[64px] flex flex-col justify-center cursor-pointer group`}
                            onClick={() => !returnDate && document.getElementById('return-date-picker')?.click()}
                        >
                            {!returnDate ? (
                                <div className="flex items-center justify-center gap-2 text-blue-600 font-medium h-full">
                                    <PlusOutlined /> <span>Thêm ngày về</span>
                                    <DatePicker 
                                        id="return-date-picker" 
                                        className="w-0 h-0 opacity-0 overflow-hidden absolute" 
                                        onChange={setReturnDate} 
                                        format="DD/MM/YYYY"
                                        disabledDate={(current) => current && current < (date || dayjs())}
                                    />
                                </div>
                            ) : (
                                <>
                                    <span className="text-xs text-gray-500 font-medium ml-3">Ngày về</span>
                                    <div className="flex items-center">
                                        <DatePicker 
                                            value={returnDate} 
                                            onChange={setReturnDate} 
                                            format="DD/MM/YYYY" 
                                            variant="borderless" 
                                            className="w-full text-base font-bold p-0 pl-3" 
                                            suffixIcon={<CalendarFilled className="text-blue-500" />} 
                                            disabledDate={(current) => current && current < (date || dayjs())}
                                        />
                                        <Button type="text" size="small" icon={<span className="text-gray-400">×</span>} onClick={(e) => { e.stopPropagation(); setReturnDate(null); }} className="mr-2" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="h-[50px] md:h-[64px] flex items-center">
                            <Button type="primary" block size="large" onClick={handleSearch} className="h-full !rounded-lg text-lg font-bold shadow-md uppercase tracking-wide">
                                Tìm kiếm
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {!isCompact && (
          <div className="bg-black/50 backdrop-blur-md text-white py-3 w-full absolute bottom-0 z-10 hidden md:block">
            <div className="container mx-auto flex justify-center gap-8 lg:gap-16 text-sm font-medium">
              <div className="flex items-center gap-2"><SafetyCertificateFilled className="text-yellow-400 text-xl" /><span>Chắc chắn có chỗ</span></div>
              <div className="flex items-center gap-2"><PhoneFilled className="text-yellow-400 text-xl" /><span>Hỗ trợ 24/7</span></div>
              <div className="flex items-center gap-2"><TagFilled className="text-yellow-400 text-xl" /><span>Nhiều ưu đãi</span></div>
              <div className="flex items-center gap-2"><CreditCardFilled className="text-yellow-400 text-xl" /><span>Thanh toán đa dạng</span></div>
            </div>
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}