'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ConfigProvider, Select, DatePicker, Button, Tabs, message 
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
    Select: { controlHeight: 32, controlItemBgActive: '#e6f7ff' } 
  },
};

export default function HeroSearch({ isCompact = false }: { isCompact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [provinceOptions, setProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [fromProvince, setFromProvince] = useState<string | null>(null);
  const [toProvince, setToProvince] = useState<string | null>(null);
  const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [returnDate, setReturnDate] = useState<dayjs.Dayjs | null>(null);

  // --- Lấy dữ liệu tỉnh thành ---
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingData(true);
      try {
        const res = await fetch('/api/owner/stations?status=active'); 
        if (res.ok) {
           const data = await res.json();
           if (data.success && Array.isArray(data.data)) {
             const uniqueProvinces = Array.from(new Set(data.data.map((station: any) => station.province)));
             const options = uniqueProvinces
               .sort((a: any, b: any) => a.localeCompare(b))
               .map((prov: any) => ({ value: prov, label: prov }));
             setProvinceOptions(options);
           }
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchProvinces();
  }, []);

  // --- Sync URL params ---
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
    const params = new URLSearchParams();
    params.set('from', fromProvince);
    params.set('to', toProvince);
    if (date) params.set('date', date.format('YYYY-MM-DD'));
    if (returnDate) params.set('returnDate', returnDate.format('YYYY-MM-DD'));
    router.push(`/search?${params.toString()}`);
  };

  const handleSelectChange = (setter: React.Dispatch<React.SetStateAction<string | null>>) => (value: string) => {
    setter(value);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const filterOption = (input: string, option?: { label: string; value: string }) => {
    return removeAccents(option?.label ?? '').includes(removeAccents(input));
  };

  const tabItems = [{ label: <span className="flex items-center gap-2 font-semibold"><CarOutlined /> Xe khách</span>, key: 'bus' }];


  const rootContainerClass = isCompact 
    ? "sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm"
    : "relative w-full mb-10";

  const formPositionClass = isCompact
  ? "w-full max-w-[1200px] mx-auto px-4 lg:px-0"
  : `
      relative
      w-[95%]
      mx-auto
      -mt-20 
      z-20
      md:absolute
      md:top-1/2
      md:left-1/2
      md:-translate-x-1/2
      md:-translate-y-1/2
      md:-mt-24
      md:max-w-6xl
    `;

  const formBoxClass = isCompact
    ? ""
    : "bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden";

  const innerLayoutClass = isCompact
  ? "grid grid-cols-2 gap-1 lg:flex lg:flex-row lg:items-center lg:gap-0 lg:border lg:border-gray-300 lg:rounded-lg lg:p-1 lg:bg-white"
  : "p-3 sm:p-4 flex flex-col gap-3 md:gap-4 lg:flex-row lg:items-center";

  const inputItemClass = isCompact
    ? "relative h-[50px] lg:h-[48px] border border-gray-300 rounded-md lg:border-0 lg:rounded-none lg:border-r lg:border-gray-200 flex flex-col justify-center px-2 hover:bg-gray-50 transition"
    : "border border-gray-300 rounded-lg p-2 hover:border-blue-500 transition bg-white h-[60px] md:h-[70px] flex flex-col justify-center relative";

  const locationItemClass = isCompact ? "col-span-2 lg:flex-1" : "flex-1";
  const dateItemClass = isCompact ? "col-span-1 lg:w-[180px]" : "lg:w-[180px]";
  const buttonContainerClass = isCompact ? "col-span-2 lg:w-auto lg:pl-2" : "col-span-2 lg:col-span-1 mt-1 lg:mt-0";

  return (
    <ConfigProvider theme={themeConfig} locale={locale}>
      <div className={rootContainerClass}>
        
        {/* Banner */}
        {!isCompact && (
          <div 
            // SỬA: Giảm chiều cao banner mobile xuống 250px (cũ 400px)
            className="w-full h-[250px] md:h-[550px] bg-cover bg-center bg-no-repeat relative flex flex-col items-center"
            style={{ backgroundColor: '#dceeff', backgroundImage: "url('https://static.vexere.com/production/banners/993/banner-home-tet-2025.png')" }}
          >
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 md:hidden"></div>
             <div className="hidden md:block bg-black/50 backdrop-blur-md text-white py-3 w-full absolute bottom-0 z-10">
                <div className="container mx-auto flex justify-center gap-8 lg:gap-16 text-sm font-medium">
                  <div className="flex items-center gap-2"><SafetyCertificateFilled className="text-yellow-400 text-xl" /><span>Chắc chắn có chỗ</span></div>
                  <div className="flex items-center gap-2"><PhoneFilled className="text-yellow-400 text-xl" /><span>Hỗ trợ 24/7</span></div>
                  <div className="flex items-center gap-2"><TagFilled className="text-yellow-400 text-xl" /><span>Nhiều ưu đãi</span></div>
                  <div className="flex items-center gap-2"><CreditCardFilled className="text-yellow-400 text-xl" /><span>Thanh toán đa dạng</span></div>
                </div>
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className={formPositionClass}>
            <div className={formBoxClass}>
                
                {!isCompact && (
                   <div className="px-4 md:px-6 pt-2 border-b border-gray-100 flex justify-center md:justify-start bg-white">
                      <Tabs defaultActiveKey="bus" items={tabItems} size="large" className="font-bold" />
                   </div>
                )}

                <div className={innerLayoutClass}>
                    
                    {/* Nơi đi + Swap + Nơi đến */}
                    <div className={`relative col-span-2 lg:flex lg:flex-row lg:items-center lg:flex-1`}>
                      {/* Nơi đi */}
                      <div className={`${inputItemClass} flex-1`}>
                        <span className="text-[11px] text-gray-500 font-medium ml-2 lg:ml-3">Nơi xuất phát</span>
                        <Select
                          showSearch
                          variant="borderless"
                          value={fromProvince}
                          onChange={handleSelectChange(setFromProvince)}
                          options={provinceOptions}
                          loading={loadingData}
                          placeholder="Chọn điểm đi"
                          className="w-full text-sm font-bold !bg-transparent -ml-1 mt-[-2px]"
                          suffixIcon={<EnvironmentFilled className="text-blue-500" />}
                          filterOption={filterOption}
                        />
                      </div>

                      {/* Swap */}
                      <div className={`
                          flex justify-center items-center my-2 lg:my-0
                          lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-30
                        `}>
                        <Button
                          shape="circle"
                          size={isCompact ? 'small' : 'middle'}
                          onClick={handleSwap}
                          icon={<SwapOutlined className="rotate-90 lg:rotate-0" />}
                          className="shadow-md bg-white border border-gray-300 text-blue-600 hover:border-blue-500 hover:scale-110 transition"
                        />
                      </div>

                      {/* Nơi đến */}
                      <div className={`${inputItemClass} flex-1`}>
                        <span className="text-[11px] text-gray-500 font-medium ml-2 lg:ml-3">Nơi đến</span>
                        <Select
                          showSearch
                          variant="borderless"
                          value={toProvince}
                          onChange={handleSelectChange(setToProvince)}
                          options={provinceOptions}
                          loading={loadingData}
                          placeholder="Chọn điểm đến"
                          className="w-full text-sm font-bold !bg-transparent -ml-1 mt-[-2px]"
                          suffixIcon={<EnvironmentFilled className="text-red-500" />}
                          filterOption={filterOption}
                        />
                      </div>
                    </div>

                    {/* Ngày đi */}
                    <div className={`${inputItemClass} ${dateItemClass}`}>
                         <span className="text-[11px] text-gray-500 font-medium ml-2 lg:ml-3 lg:mt-[-4px]">Ngày đi</span>
                         <DatePicker 
                             value={date}
                             onChange={setDate}
                             format="DD/MM/YYYY"
                             variant="borderless"
                             allowClear={false}
                             className="w-full text-sm font-bold p-0 pl-2 lg:pl-3 !bg-transparent mt-[-2px]"
                             suffixIcon={isCompact ? null : <CalendarFilled className="text-blue-500" />}
                             disabledDate={(current) => current && current < dayjs().startOf('day')}
                         />
                    </div>

                    {/* Ngày về */}
                    <div 
                        className={`${inputItemClass} ${dateItemClass} lg:border-r-0 cursor-pointer`}
                        onClick={() => !returnDate && document.getElementById('return-date-picker')?.click()}
                    >
                        {!returnDate ? (
                            <div className="flex items-center gap-1 lg:gap-2 text-blue-600 font-medium h-full px-1 text-xs lg:text-sm">
                                <PlusOutlined /> <span className="whitespace-nowrap">Khứ hồi</span>
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
                                <span className="text-[11px] text-gray-500 font-medium ml-2 lg:ml-3 lg:mt-[-4px]">Ngày về</span>
                                <div className="flex items-center">
                                    <DatePicker 
                                        value={returnDate} 
                                        onChange={setReturnDate} 
                                        format="DD/MM/YYYY" 
                                        variant="borderless" 
                                        className="w-full text-sm font-bold p-0 pl-2 lg:pl-3 !bg-transparent mt-[-2px]" 
                                        suffixIcon={null} 
                                        disabledDate={(current) => current && current < (date || dayjs())}
                                    />
                                    <Button type="text" size="small" icon={<span className="text-gray-400">×</span>} onClick={(e) => { e.stopPropagation(); setReturnDate(null); }} className="mr-1" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Nút tìm kiếm */}
                    <div className={buttonContainerClass}> 
                      <Button 
                        type="primary" 
                        block 
                        size={isCompact ? "middle" : "large"} 
                        onClick={handleSearch} 
                        className={`
                             !rounded-lg font-bold shadow-md uppercase tracking-wide
                             ${isCompact ? 'h-[50px] lg:h-[48px] lg:px-8 text-sm lg:text-base' : 'h-[50px] md:h-[70px] text-lg w-full'}
                        `}
                      >
                        {isCompact ? 'Tìm' : 'Tìm kiếm'}
                      </Button>
                    </div>

                </div>
            </div>
        </div>
      </div>
    </ConfigProvider>
  );
}