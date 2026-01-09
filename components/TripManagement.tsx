
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ClipboardList, Search, Clock, ArrowUpDown, Play, CheckCircle2, XCircle, Loader2, ArrowRight, User, Car, History, Timer, X, AlertCircle, ChevronDown, Check, Phone, Calendar, Lock
} from 'lucide-react';
import { Trip, Profile, TripStatus, Booking } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig } from './SearchTrips';
import { TableSkeleton } from './OrderManagement';

const removeAccents = (str: string) => {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();
};

const statusOptions = [
  { label: 'Chuẩn bị', value: TripStatus.PREPARING, style: 'text-orange-600 bg-orange-50 border-orange-100', icon: Timer },
  { label: 'Sát giờ', value: TripStatus.URGENT, style: 'text-rose-600 bg-rose-50 border-rose-100', icon: AlertCircle },
  { label: 'Đang chạy', value: TripStatus.ON_TRIP, style: 'text-blue-600 bg-blue-50 border-blue-100', icon: Play },
  { label: 'Hoàn thành', value: TripStatus.COMPLETED, style: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  { label: 'Đã huỷ', value: TripStatus.CANCELLED, style: 'text-rose-600 bg-rose-50 border-rose-100', icon: X },
  { label: 'Đầy chỗ', value: TripStatus.FULL, style: 'text-slate-600 bg-slate-50 border-slate-200', icon: AlertCircle },
];

export const TripStatusSelector = ({ value, onChange, disabled, arrivalTime }: { value: TripStatus, onChange: (status: TripStatus) => void, disabled?: boolean, arrivalTime?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  
  const currentStatus = statusOptions.find(s => s.value === value) || statusOptions[0];
  const filteredOptions = statusOptions.filter(opt => 
    removeAccents(opt.label).includes(removeAccents(statusSearch))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setStatusSearch('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isTooEarlyToComplete = (optValue: TripStatus) => {
    if (optValue !== TripStatus.COMPLETED) return false;
    if (!arrivalTime) return false;
    return now < new Date(arrivalTime);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={disabled} 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl border transition-all duration-300 relative z-20 ${currentStatus.style} ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm' : 'hover:brightness-95'} ${disabled ? 'opacity-80 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <currentStatus.icon size={10} className={currentStatus.style.split(' ')[0]} />
          <span className="text-[10px] font-bold truncate">{currentStatus.label}</span>
        </div>
        {!disabled && <ChevronDown size={10} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />}
        {disabled && <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />}
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute top-full mt-1 right-0 w-52 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-100 z-[999] p-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative mb-2 px-1 pt-1">
            <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" autoFocus placeholder="Tìm trạng thái..." value={statusSearch}
              onChange={(e) => setStatusSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-8 pr-2 py-2 bg-slate-50 border-none rounded-lg text-[10px] font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar p-0.5">
            {filteredOptions.length > 0 ? filteredOptions.map((opt) => {
              const blocked = isTooEarlyToComplete(opt.value);
              return (
                <button 
                  key={opt.value} type="button" 
                  disabled={blocked}
                  onMouseDown={(e) => { 
                    if (blocked) return;
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    onChange(opt.value); 
                    setIsOpen(false); 
                    setStatusSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${value === opt.value ? 'bg-indigo-600 text-white shadow-md' : blocked ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className="flex items-center gap-3">
                    {blocked ? <Lock size={12} className="text-slate-400" /> : <opt.icon size={12} className={value === opt.value ? 'text-white' : opt.style.split(' ')[0]} />}
                    <span className="text-[11px] font-bold">{opt.label}</span>
                  </div>
                  {value === opt.value && <Check size={12} className="text-white" />}
                  {blocked && <span className="text-[8px] font-bold text-slate-400 italic">Chưa tới giờ</span>}
                </button>
              );
            }) : (
              <div className="p-3 text-center text-[9px] text-slate-400 font-bold italic">Không có dữ liệu</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface TripManagementProps {
  profile: Profile | null;
  trips: Trip[];
  bookings: Booking[];
  onRefresh: () => void;
  onViewTripDetails: (trip: Trip) => void; 
}

type SortConfig = { key: keyof Trip | 'driver_name'; direction: 'asc' | 'desc' | null };

const TripManagement: React.FC<TripManagementProps> = ({ profile, trips, bookings, onRefresh, onViewTripDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, sortOrder]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  
  const handleSort = (key: SortConfig['key']) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const displayTrips = useMemo(() => {
    const searchNormalized = removeAccents(searchTerm);
    let filtered = trips.filter(trip => {
      const isOwner = isAdmin || trip.driver_id === profile?.id;
      const tripCode = trip.trip_code || (trip.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '');
      const matchesSearch = removeAccents(trip.origin_name).includes(searchNormalized) || 
                            removeAccents(trip.dest_name).includes(searchNormalized) ||
                            (tripCode && removeAccents(tripCode).includes(searchNormalized)) ||
                            (trip.driver_name && removeAccents(trip.driver_name).includes(searchNormalized));
      const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(trip.status);
      return isOwner && matchesSearch && matchesStatus;
    });

    filtered.sort((a: any, b: any) => {
      if (sortOrder === 'NEWEST') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortOrder === 'DEPARTURE_ASC') return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
      if (sortOrder === 'PRICE_ASC') return a.price - b.price;
      if (sortOrder === 'SEATS_DESC') return b.available_seats - a.available_seats;
      return 0;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'created_at' || sortConfig.key === 'departure_time') {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [trips, searchTerm, statusFilter, sortOrder, sortConfig, isAdmin, profile]);

  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus) => {
    const trip = trips.find(t => t.id === tripId);
    
    if (trip?.status === TripStatus.COMPLETED) {
       alert("Chuyến xe đã hoàn thành, không thể thay đổi thông tin.");
       return;
    }

    if (newStatus === TripStatus.COMPLETED && trip?.arrival_time) {
      const now = new Date();
      const arrival = new Date(trip.arrival_time);
      if (now < arrival) {
        alert(`Không thể hoàn thành chuyến xe sớm hơn thời gian dự kiến đến (${arrival.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ngày ${arrival.toLocaleDateString('vi-VN')}).`);
        return;
      }
    }
    
    tripId = String(tripId);
    setActionLoading(tripId);
    try {
      const { error } = await supabase.from('trips').update({ status: newStatus }).eq('id', tripId);
      if (error) throw error;
      onRefresh();
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setActionLoading(null); 
    }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: SortConfig['key'], width?: string, textAlign?: string }) => (
    <th 
      style={{ width }} 
      className={`px-4 py-4 text-[11px] font-bold text-slate-500 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Cập nhật màu nền cho Frame Search & Filter của Quản lý chuyến xe - Đồng nhất Emerald-Indigo */}
      <div className="bg-gradient-to-br from-emerald-50/80 to-indigo-50/60 p-6 rounded-[32px] border border-emerald-100 shadow-sm space-y-5 backdrop-blur-sm relative z-30">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
              <input 
                type="text" placeholder="Tìm..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setLoading(true); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50/50 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" 
              />
            </div>
            <div className="w-full">
              <UnifiedDropdown 
                label="Sắp xếp" icon={ArrowUpDown} value={sortOrder} width="w-full" showCheckbox={false}
                options={[
                  { label: 'Vừa đăng xong', value: 'NEWEST' },
                  { label: 'Sắp khởi hành', value: 'DEPARTURE_ASC' },
                  { label: 'Giá thấp nhất', value: 'PRICE_ASC' },
                  { label: 'Nhiều ghế nhất', value: 'SEATS_DESC' }
                ]}
                onChange={(val: string) => { setSortOrder(val); setLoading(true); }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-3 w-full">
            <UnifiedDropdown 
              label="Trạng thái" icon={ClipboardList} value={statusFilter} width="w-full lg:w-48" showCheckbox={true}
              isStatus={true}
              statusConfig={statusOptions}
              options={[
                {label:'Tất cả', value:'ALL'}, 
                ...statusOptions
              ]}
              onChange={(val: string[]) => { setStatusFilter(val); setLoading(true); }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-4">
        {displayTrips.map(trip => {
          const fillPercent = Math.min(100, ((trip.seats - trip.available_seats) / trip.seats) * 100);
          const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
          const depDate = new Date(trip.departure_time).toLocaleDateString('vi-VN');
          const tripCode = trip.trip_code || (trip.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '');
          const isCompleted = trip.status === TripStatus.COMPLETED;

          return (
            <div key={trip.id} className={`bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-visible ${isCompleted ? 'opacity-80 bg-slate-50/50' : ''}`} onClick={() => onViewTripDetails(trip)}>
              <div className="flex justify-between items-start mb-4">
                <div className="inline-flex items-center bg-rose-50 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-black border border-rose-100">
                  <CopyableCode code={tripCode} label={tripCode} />
                </div>
                <div className="w-32" onClick={(e) => e.stopPropagation()}>
                  {actionLoading === trip.id ? (
                    <div className="flex items-center justify-center py-1 bg-slate-50 rounded-xl border border-slate-100">
                      <Loader2 className="animate-spin text-indigo-500" size={12} />
                    </div>
                  ) : (
                    <TripStatusSelector 
                      value={trip.status} 
                      disabled={isCompleted}
                      arrivalTime={trip.arrival_time}
                      onChange={(newStatus) => handleUpdateStatus(trip.id, newStatus)} 
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{trip.origin_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{depTime}</span>
                      <span className="text-[10px] font-bold text-slate-400">{depDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{trip.dest_name}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">Giá vé</span>
                  <span className="text-sm font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-bold text-slate-500">{trip.seats - trip.available_seats}/{trip.seats} ghế</span>
                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${fillPercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${fillPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-visible min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1250px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Thông tin chuyến" sortKey="created_at" width="14%" />
                <SortHeader label="Phương tiện" sortKey="vehicle_info" width="16%" />
                <SortHeader label="Trạng thái" sortKey="status" width="14%" textAlign="text-center" />
                <SortHeader label="Điểm đón" sortKey="origin_name" width="22%" />
                <SortHeader label="Điểm đến" sortKey="dest_name" width="22%" />
                <SortHeader label="Giá / Ghế" sortKey="price" width="12%" textAlign="text-right" />
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton cols={6} rows={6} />
            ) : (
              <tbody className="divide-y divide-slate-50">
                {displayTrips.map(trip => {
                  const fillPercent = Math.min(100, ((trip.seats - trip.available_seats) / trip.seats) * 100);
                  const isCompleted = trip.status === TripStatus.COMPLETED;
                  const isOngoing = trip.status === TripStatus.ON_TRIP;
                  const isUrgent = trip.status === TripStatus.URGENT;
                  
                  const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                  const depDate = new Date(trip.departure_time).toLocaleDateString('vi-VN');
                  
                  const arrivalDateObj = trip.arrival_time ? new Date(trip.arrival_time) : null;
                  const arrTime = arrivalDateObj ? arrivalDateObj.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const arrDate = arrivalDateObj ? arrivalDateObj.toLocaleDateString('vi-VN') : '--/--/----';

                  const createdAt = trip.created_at ? new Date(trip.created_at) : null;
                  const postTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const postDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';

                  const tripCode = trip.trip_code || (trip.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '');

                  const vConfig = getVehicleConfig(trip.vehicle_info);
                  const VIcon = vConfig.icon;
                  const vehicleParts = trip.vehicle_info.split(' (');
                  const vehicleModel = vehicleParts[0] || '---';
                  const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';


                  return (
                    <tr 
                      key={trip.id} 
                      className={`hover:bg-slate-50/30 transition-colors cursor-pointer ${isCompleted ? 'bg-slate-50/20 opacity-90' : isOngoing ? 'bg-blue-50/10' : isUrgent ? 'bg-rose-50/10' : ''}`}
                      onClick={() => onViewTripDetails(trip)} 
                    >
                      <td className="px-4 py-4">
                         <div className={`flex flex-col gap-2 ${isCompleted ? 'opacity-90' : ''}`}>
                            <div className="flex items-center gap-1.5 self-start">
                              <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[9px] font-black">{postTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[9px] font-bold">{postDate}</span>
                              </div>
                            </div>
                            <div className="inline-flex items-center bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm self-start">
                               <CopyableCode code={tripCode} className="text-[9px] font-black" label={tripCode} />
                            </div>
                         </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className={`flex flex-col gap-1.5 ${isCompleted ? 'opacity-90' : ''}`}>
                           <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-bold ${vConfig.style} self-start whitespace-nowrap`}>
                             <VIcon size={8} />
                             <span className="text-[8px]">{vehicleModel}</span>
                           </div>
                           {licensePlate && (
                              <div className="inline-flex bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm self-start whitespace-nowrap">
                                <CopyableCode code={licensePlate} className="text-[9px] font-black uppercase tracking-wider" label={licensePlate} />
                              </div>
                           )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="w-36 mx-auto relative" onClick={(e) => e.stopPropagation()}>
                          {actionLoading === trip.id ? (
                            <div className="flex items-center justify-center py-1 bg-slate-50 rounded-xl border border-slate-100">
                              <Loader2 className="animate-spin text-indigo-500" size={12} />
                            </div>
                          ) : (
                            <TripStatusSelector 
                              value={trip.status} 
                              disabled={isCompleted}
                              arrivalTime={trip.arrival_time}
                              onChange={(newStatus) => handleUpdateStatus(trip.id, newStatus)} 
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                         <div className={`flex flex-col gap-1.5 ${isCompleted ? 'opacity-90' : ''}`}>
                            <div className="flex items-center gap-1.5 self-start">
                              <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[9px] font-black">{depTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[9px] font-bold">{depDate}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-800 truncate leading-tight mt-0.5 pr-2">
                              {trip.origin_name}
                            </p>
                         </div>
                      </td>

                      <td className="px-4 py-4">
                         <div className={`flex flex-col gap-1.5 ${isCompleted ? 'opacity-90' : ''}`}>
                            <div className="flex items-center gap-1.5 self-start">
                              <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[9px] font-black">{arrTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[9px] font-bold">{arrDate}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-emerald-600 truncate leading-tight mt-0.5 pr-2">
                              {trip.dest_name}
                            </p>
                         </div>
                      </td>

                      <td className="px-4 py-4 text-right pr-6">
                        <div className={`${isCompleted ? 'opacity-90' : ''}`}>
                          <p className="text-[10px] font-bold text-emerald-600 leading-tight">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ</p>
                          <div className="flex flex-col items-end mt-1.5 gap-1">
                            <span className="text-[8px] font-bold text-slate-500">{trip.seats - trip.available_seats}/{trip.seats} ghế</span>
                            <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${fillPercent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${fillPercent}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
          <div className="h-40"></div>
        </div>
      </div>
    </div>
  );
};
export default TripManagement;
