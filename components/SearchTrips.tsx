
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search as SearchIcon, MapPin, Calendar, Clock, User, ChevronRight, Star, LayoutGrid, CalendarDays, ChevronDown, Car, CarFront, Sparkles, Crown, DollarSign, ArrowUpDown, Filter, Check, X, History, Users, ArrowRight, AlertCircle, Timer, Zap, CheckCircle2, Play, Radio } from 'lucide-react';
import { Trip, TripStatus, Booking } from '../types.ts';
import CopyableCode from './CopyableCode.tsx';

const removeAccents = (str: string) => {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
};

export const getVehicleConfig = (vehicleName: string) => {
  const name = vehicleName.toLowerCase();
  if (name.includes('sedan') || name.includes('4 chỗ')) {
    return { style: 'bg-blue-50 text-blue-600 border-blue-100', icon: Car };
  }
  if (name.includes('suv') || (name.includes('7 chỗ') && !name.includes('green'))) {
    return { style: 'bg-orange-50 text-orange-600 border-orange-100', icon: CarFront };
  }
  if (name.includes('limousine')) {
    return { style: 'bg-purple-50 text-purple-600 border-purple-100', icon: Crown };
  }
  if (name.includes('green')) {
    return { style: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Zap };
  }
  return { style: 'bg-slate-50 text-slate-600 border-slate-100', icon: Car };
};

export const getTripStatusDisplay = (trip: Trip) => {
  const status = trip.status;
  if (status === TripStatus.CANCELLED) {
    return { label: 'Huỷ', icon: X, style: 'bg-rose-50 text-rose-500 border-rose-100' };
  }
  if (status === TripStatus.COMPLETED) {
    return { label: 'Hoàn thành', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  }
  if (status === TripStatus.ON_TRIP) {
    return { label: 'Đang chạy', icon: Play, style: 'bg-blue-50 text-blue-600 border-blue-100' };
  }
  if (status === TripStatus.URGENT) {
    return { label: 'Sát giờ', icon: AlertCircle, style: 'bg-rose-50 text-rose-600 border-rose-100' };
  }
  if (status === TripStatus.PREPARING) {
    return { label: 'Chuẩn bị', icon: Timer, style: 'bg-orange-50 text-orange-600 border-orange-100' };
  }
  if (status === TripStatus.FULL || (trip.available_seats !== undefined && trip.available_seats <= 0)) {
    return { label: 'Đầy chỗ', icon: AlertCircle, style: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  return { label: 'Chờ', icon: Clock, style: 'bg-amber-50 text-amber-500 border-amber-100' };
};

export const UnifiedDropdown = ({ label, icon: Icon, options, value, onChange, placeholder = "Tìm nhanh...", isVehicle = false, isStatus = false, statusConfig = [], width = "w-48", showCheckbox = true }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) => 
    removeAccents(opt.label).includes(removeAccents(search))
  );

  const isSelected = (optValue: string) => {
    if (Array.isArray(value)) return value.includes(optValue);
    return value === optValue;
  };

  const handleSelect = (optValue: string) => {
    if (!showCheckbox) {
      onChange(optValue);
      setIsOpen(false);
      return;
    }

    let newValues = Array.isArray(value) ? [...value] : [value];
    
    if (optValue === 'ALL') {
      newValues = ['ALL'];
    } else {
      newValues = newValues.filter(v => v !== 'ALL');
      if (newValues.includes(optValue)) {
        newValues = newValues.filter(v => v !== optValue);
        if (newValues.length === 0) newValues = ['ALL'];
      } else {
        newValues.push(optValue);
      }
    }
    onChange(newValues);
  };

  const renderCurrentLabel = () => {
    if (!Array.isArray(value) || value.includes('ALL') || value.length === 0) {
      if (Array.isArray(value) && value.length === 0) return <span className="text-[11px] font-bold text-slate-500 truncate">{label}</span>;
      const singleVal = Array.isArray(value) ? value[0] : value;
      if (singleVal === 'ALL') return <span className="text-[11px] font-bold text-slate-500 truncate">{label}</span>;
      const opt = options.find((o: any) => o.value === singleVal);
      return opt ? renderBadge(opt, true) : label;
    }

    if (value.length === 1) {
      const opt = options.find((o: any) => o.value === value[0]);
      return opt ? renderBadge(opt, true) : label;
    }

    return <span className="text-[11px] font-bold text-emerald-600 truncate">Đã chọn ({value.length})</span>;
  };

  const renderBadge = (opt: any, isMain = false) => {
    if (isVehicle && opt.value !== 'ALL') {
      const config = getVehicleConfig(opt.label);
      const VIcon = config.icon;
      return (
        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold truncate ${config.style}`}>
          <VIcon size={10} /> {opt.label}
        </span>
      );
    }
    if (isStatus && opt.value !== 'ALL' && statusConfig.length > 0) {
      const config = statusConfig.find((s: any) => s.value === opt.value);
      if (config) {
        const SIcon = config.icon;
        return (
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold truncate ${config.style}`}>
            <SIcon size={10} /> {opt.label}
          </span>
        );
      }
    }
    return <span className={`text-[11px] font-bold truncate ${isMain ? 'text-emerald-600' : 'text-slate-700'}`}>{opt.label}</span>;
  };

  return (
    <div className={`relative shrink-0 ${width}`} ref={dropdownRef}>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-400 transition-all shadow-sm ${isOpen ? 'ring-2 ring-emerald-100 border-emerald-400' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <Icon size={14} className={(!Array.isArray(value) ? value === 'ALL' : value.includes('ALL')) ? 'text-slate-500' : 'text-emerald-500'} />
          {renderCurrentLabel()}
        </div>
        <ChevronDown size={12} className={`text-slate-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-slate-100 rounded-[24px] shadow-2xl z-[100] p-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative mb-2 px-1 pt-1">
            <SearchIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              autoFocus
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-100 placeholder:text-slate-500"
            />
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
            {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(opt.value); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${isSelected(opt.value) ? 'bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {showCheckbox && (
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected(opt.value) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'}`}>
                    {isSelected(opt.value) && <Check size={10} className="text-white" />}
                  </div>
                )}
                {renderBadge(opt, isSelected(opt.value))}
              </button>
            )) : (
              <div className="p-4 text-center text-[10px] text-slate-500 italic font-bold">Không tìm thấy kết quả</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const TripCardSkeleton = () => (
  <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
        <div className="space-y-2 pt-1">
          <div className="h-3 w-20 bg-slate-100 rounded"></div>
          <div className="h-2 w-16 bg-slate-50 rounded"></div>
        </div>
      </div>
      <div className="h-5 w-14 bg-slate-100 rounded-lg"></div>
    </div>
    <div className="space-y-3 py-2">
      <div className="h-3 w-full bg-slate-100 rounded"></div>
      <div className="h-3 w-3/4 bg-slate-100 rounded"></div>
    </div>
    <div className="pt-4 border-t border-slate-50 flex justify-between">
      <div className="h-4 w-16 bg-slate-100 rounded"></div>
      <div className="h-4 w-12 bg-slate-100 rounded"></div>
    </div>
    <div className="h-10 w-full bg-slate-100 rounded-xl mt-2"></div>
  </div>
);

const TripCard: React.FC<{ trip: Trip; onBook: (id: string) => void; userBookings?: Booking[] }> = ({ trip, onBook, userBookings = [] }) => {
  const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
  const departureDate = new Date(trip.departure_time);
  const statusInfo = getTripStatusDisplay(trip);
  const StatusIcon = statusInfo.icon;

  const timeStr = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = departureDate.toLocaleDateString('vi-VN');
  
  const arrivalStr = trip.arrival_time 
    ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null;

  const totalSeatsBooked = useMemo(() => {
    return userBookings
      .filter(b => b.trip_id === trip.id && (b.status === 'PENDING' || b.status === 'CONFIRMED'))
      .reduce((sum, b) => sum + b.seats_booked, 0);
  }, [userBookings, trip.id]);

  const hasBooked = totalSeatsBooked > 0;
  const isOngoing = trip.status === TripStatus.ON_TRIP;
  const isUrgent = trip.status === TripStatus.URGENT;
  const isPreparing = trip.status === TripStatus.PREPARING;
  
  const isBookable = statusInfo.label !== 'Hoàn thành' && statusInfo.label !== 'Đang chạy' && statusInfo.label !== 'Huỷ';
  const vehicleConfig = getVehicleConfig(trip.vehicle_info);
  const VIcon = vehicleConfig.icon;

  return (
    <div className={`bg-white p-5 rounded-[28px] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden relative flex flex-col h-full ${!isBookable && !hasBooked ? 'opacity-60 grayscale-[0.3] border-slate-100' : isOngoing ? 'border-blue-200 bg-blue-50/20' : isUrgent ? 'border-rose-400 bg-rose-50/20' : isPreparing ? 'border-orange-300 bg-orange-50/10' : 'border-slate-100'}`}>
      <div className={`absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold z-10 ${statusInfo.style}`}>
        {isOngoing ? <Radio size={10} className="animate-pulse" /> : <StatusIcon size={10} />}
        {statusInfo.label}
      </div>

      <div className="flex justify-between items-start mb-5 pt-2">
        <div className="flex gap-2.5 items-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-sm font-bold border border-emerald-100 shrink-0">
            {trip.driver_name?.charAt(0) || 'T'}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate">{trip.driver_name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star size={8} fill="#f59e0b" className="text-amber-500" />
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-bold truncate ${vehicleConfig.style}`}>
                <VIcon size={9} /> {trip.vehicle_info}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5 relative flex-1">
        <div className="absolute left-[7px] top-3 bottom-3 w-[1px] bg-slate-200 border-l border-dashed border-slate-300"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 bg-white shrink-0"></div>
          <p className="font-bold text-slate-700 text-[12px] truncate">{trip.origin_name}</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-emerald-50 shrink-0"></div>
          <p className="font-bold text-slate-700 text-[12px] truncate">{trip.dest_name}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-[13px] font-bold text-slate-800">
            <Clock size={12} className="text-emerald-500" /> {timeStr}
            {arrivalStr && <><ArrowRight size={10} className="text-slate-400" /> <span className="text-emerald-500">{arrivalStr}</span></>}
          </div>
          <div className="text-[10px] font-bold text-slate-500 mt-0.5">{dateStr}</div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-emerald-600 tracking-tight">
            {new Intl.NumberFormat('vi-VN').format(trip.price)}đ
          </p>
          <div className={`${trip.available_seats <= 0 ? 'text-rose-500' : 'text-slate-500'} text-[9px] font-bold`}>
            {trip.available_seats <= 0 ? `0/${trip.seats} trống` : `${trip.available_seats}/${trip.seats} trống`}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-1.5 text-[9px] font-bold text-slate-500 border-t border-slate-100 pt-3 italic">
        <div className="flex items-center gap-1">
          <History size={10} className="text-slate-400" /> 
          {trip.created_at ? `Đăng lúc: ${new Date(trip.created_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date(trip.created_at).toLocaleDateString('vi-VN')}` : 'Mới cập nhật'}
        </div>
        <CopyableCode code={tripCode} className="text-[8px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 opacity-70 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); onBook(trip.id); }}
        disabled={!isBookable && !hasBooked}
        className={`w-full mt-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
          hasBooked 
          ? isOngoing ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 active:scale-95' : isUrgent ? 'bg-rose-600 text-white shadow-lg shadow-rose-100 active:scale-95' : 'bg-rose-600 text-white shadow-lg shadow-rose-100 active:scale-95'
          : isBookable
            ? isUrgent ? 'bg-rose-600 text-white shadow-lg shadow-rose-100 active:scale-95' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95' 
            : isOngoing 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 active:scale-95'
              : 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
        }`}
      >
        {hasBooked ? (
          <><CheckCircle2 size={14} /> Đã đặt {totalSeatsBooked} ghế</>
        ) : (
          statusInfo.label === 'Hoàn thành' ? 'Chuyến đã kết thúc' : 
          statusInfo.label === 'Đang chạy' ? <><Play size={14} /> Xem hành trình</> : 
          statusInfo.label === 'Huỷ' ? 'Chuyến xe đã huỷ' :
          statusInfo.label === 'Sát giờ' ? <><AlertCircle size={14} /> Đặt khẩn cấp</> :
          trip.available_seats <= 0 ? <><Zap size={14} /> Đặt dự phòng</> : 
          <><Zap size={14} /> Đặt chỗ ngay</>
        )}
      </button>
    </div>
  );
};

interface SearchTripsProps {
  trips: Trip[];
  onBook: (id: string) => void;
  userBookings: Booking[];
}

const SearchTrips: React.FC<SearchTripsProps> = ({ trips, onBook, userBookings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<string[]>(['ALL']);
  const [sortOrder, setSortOrder] = useState('TIME_ASC');
  const [loading, setLoading] = useState(true);

  // Giả lập loading mượt mà
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [searchTerm, vehicleFilter, sortOrder]);

  const filteredTrips = useMemo(() => {
    const searchNormalized = removeAccents(searchTerm);
    let result = trips.filter(t => {
      const tripCode = t.trip_code || (t.id ? `T${t.id.substring(0, 5).toUpperCase()}` : '');
      const matchesSearch = removeAccents(t.origin_name).includes(searchNormalized) || 
                            removeAccents(t.dest_name).includes(searchNormalized) ||
                            (tripCode && removeAccents(tripCode).includes(searchNormalized)) ||
                            (t.driver_name && removeAccents(t.driver_name).includes(searchNormalized));
      const matchesVehicle = vehicleFilter.includes('ALL') || vehicleFilter.some(v => t.vehicle_info.includes(v));
      return matchesSearch && matchesVehicle;
    });

    result.sort((a, b) => {
      const timeA = new Date(a.departure_time).getTime();
      const timeB = new Date(b.departure_time).getTime();
      const statusA = getTripStatusDisplay(a).label;
      const statusB = getTripStatusDisplay(b).label;

      if (sortOrder === 'TIME_ASC') {
        const priority = (s: string) => {
          if (s === 'Chuẩn bị') return 0;
          if (s === 'Sát giờ') return 1;
          if (s === 'Chờ') return 2;
          if (s === 'Đang chạy') return 3;
          if (s === 'Dự phòng') return 4;
          return 5;
        };
        if (priority(statusA) !== priority(statusB)) return priority(statusA) - priority(statusB);
        return timeA - timeB;
      }
      if (sortOrder === 'PRICE_ASC') return a.price - b.price;
      if (sortOrder === 'NEWEST') {
         const createA = a.created_at ? new Date(a.created_at).getTime() : 0;
         const createB = b.created_at ? new Date(b.created_at).getTime() : 0;
         return createB - createA;
      }
      return 0;
    });

    return result;
  }, [trips, searchTerm, vehicleFilter, sortOrder]);

  return (
    <div className="space-y-6 pb-20 animate-slide-up max-w-[1600px] mx-auto">
      <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-0 group">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text" placeholder="Tìm lộ trình, tài xế, mã chuyến..." 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setLoading(true); }}
              className="w-full pl-14 pr-6 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-500" 
            />
          </div>
          <UnifiedDropdown 
            label="Sắp xếp theo" icon={ArrowUpDown} value={sortOrder} width="w-56" showCheckbox={false}
            options={[
              { label: 'Sắp khởi hành', value: 'TIME_ASC' },
              { label: 'Vừa đăng xong', value: 'NEWEST' },
              { label: 'Giá từ thấp tới cao', value: 'PRICE_ASC' }
            ]}
            onChange={(val: string) => { setSortOrder(val); setLoading(true); }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <UnifiedDropdown 
            label="Loại xe" icon={Car} value={vehicleFilter} isVehicle={true} width="w-48" showCheckbox={true}
            options={[
              { label: 'Tất cả loại xe', value: 'ALL' },
              { label: 'Sedan 4 chỗ', value: '4 chỗ' },
              { label: 'SUV 7 chỗ', value: '7 chỗ' },
              { label: 'Limo Green 7 chỗ', value: 'Limo Green' },
              { label: 'Limousine 9 chỗ', value: 'Limousine' }
            ]}
            onChange={(val: string[]) => { setVehicleFilter(val); setLoading(true); }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-5 min-h-[400px]">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <TripCardSkeleton key={i} />)
        ) : filteredTrips.length > 0 ? filteredTrips.map(trip => (
          <TripCard key={trip.id} trip={trip} onBook={onBook} userBookings={userBookings} />
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
             <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
             <p className="text-xs font-bold text-slate-500 uppercase">Không có chuyến xe nào</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchTrips;
