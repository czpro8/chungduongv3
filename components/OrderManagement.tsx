
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Search, CheckCircle2, XCircle, Clock, RefreshCcw, Loader2, ArrowUpDown, Navigation, Car, User, ArrowRight, Phone, DollarSign, ChevronDown, Check, X, AlertTriangle, Timer, Ban, Calendar, Filter, Hash
} from 'lucide-react';
import { Booking, Profile, Trip } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig } from './SearchTrips';

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

const statusOptions = [
  { label: 'Chờ duyệt', value: 'PENDING', style: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
  { label: 'Xác nhận', value: 'CONFIRMED', style: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  { label: 'Từ chối', value: 'REJECTED', style: 'text-rose-600 bg-rose-50 border-rose-100', icon: XCircle },
  { label: 'Hết thời hạn', value: 'EXPIRED', style: 'text-slate-500 bg-slate-100 border-slate-200', icon: Ban },
];

export const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number, cols?: number }) => (
  <tbody className="animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-slate-50">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-6">
            <div className="h-3 bg-slate-100 rounded w-3/4"></div>
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);

const BookingStatusSelector = ({ value, onChange, disabled }: { value: string, onChange: (status: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentStatus = statusOptions.find(s => s.value === value) || statusOptions[0];
  const filteredOptions = statusOptions.filter(opt => removeAccents(opt.label).includes(removeAccents(statusSearch)));

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

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={disabled || value === 'EXPIRED'} 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl border transition-all duration-300 relative z-20 ${currentStatus.style} ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm' : 'hover:brightness-95'} ${value === 'EXPIRED' ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <currentStatus.icon size={10} className={currentStatus.style.split(' ')[0]} />
          <span className="text-[10px] font-bold truncate">{currentStatus.label}</span>
        </div>
        <ChevronDown size={10} className={`transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-44 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 z-[999] p-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative mb-1.5 px-1 pt-1">
            <Search size={10} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" autoFocus placeholder="Tìm..." value={statusSearch}
              onChange={(e) => setStatusSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border-none rounded-lg text-[10px] font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100"
            />
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar p-0.5">
            {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
              <button key={opt.value} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt.value); setIsOpen(false); setStatusSearch(''); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all ${value === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-2"><opt.icon size={10} className={value === opt.value ? 'text-white' : opt.style.split(' ')[0]} /> <span className="text-[10px] font-bold">{opt.label}</span></div>
                {value === opt.value && <Check size={10} className="text-white" />}
              </button>
            )) : (
              <div className="p-3 text-center text-[9px] text-slate-400 font-bold italic">N/A</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface OrderManagementProps {
  profile: Profile | null;
  trips: Trip[];
  onRefresh: () => void;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const parseRouteInfo = (address: string) => {
  if (!address) return { huyen: '', tinh: '' };
  const parts = address.split(',').map(p => p.trim());
  const clean = (str: string) => str.replace(/^(Huyện|Quận|Xã|Thị trấn|Thị xã|Thành phố|Tp\.)\s+/i, '').trim();
  const tinhRaw = parts[parts.length - 1] || '';
  const huyenRaw = parts[parts.length - 2] || tinhRaw;
  return { huyen: clean(huyenRaw), tinh: clean(tinhRaw) };
};

const OrderManagement: React.FC<OrderManagementProps> = ({ profile, trips, onRefresh }) => {
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [timeFilter, setTimeFilter] = useState<string[]>(['ALL']);
  const [vehicleFilter, setVehicleFilter] = useState<string[]>(['ALL']);
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [showMapId, setShowMapId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { fetchBookings(); }, [profile]);

  const fetchBookings = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let query = supabase.from('bookings').select(`*, trips(*, driver_profile:profiles(full_name, phone)), profiles:passenger_id(full_name, phone)`);
      if (profile.role === 'driver') {
        const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', profile.id);
        const myTripIds = myTrips?.map(t => t.id) || [];
        if (myTripIds.length > 0) query = query.in('trip_id', myTripIds);
        else { setAllBookings([]); setLoading(false); return; }
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setAllBookings(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const filteredOrders = useMemo(() => {
    const searchNormalized = removeAccents(searchTerm);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    let filtered = allBookings.filter(order => {
      const trip = order.trips;
      const createdAt = new Date(order.created_at);
      
      const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
      const passengerName = order.profiles?.full_name || '';
      const driverName = trip?.driver_profile?.full_name || '';
      const route = `${trip?.origin_name} ${trip?.dest_name}`;
      const matchesSearch = (order.passenger_phone && order.passenger_phone.includes(searchTerm)) || 
                            removeAccents(passengerName).includes(searchNormalized) || 
                            removeAccents(driverName).includes(searchNormalized) || 
                            removeAccents(bookingCode).includes(searchNormalized) || 
                            removeAccents(route).includes(searchNormalized);
      
      const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(order.status);

      let matchesTime = timeFilter.includes('ALL');
      if (!matchesTime) {
        if (timeFilter.includes('TODAY') && createdAt >= today) matchesTime = true;
        if (timeFilter.includes('YESTERDAY') && (createdAt >= yesterday && createdAt < today)) matchesTime = true;
        if (timeFilter.includes('WEEK') && createdAt >= weekAgo) matchesTime = true;
      }

      const matchesVehicle = vehicleFilter.includes('ALL') || (trip?.vehicle_info && vehicleFilter.some(v => trip.vehicle_info.includes(v)));

      return matchesSearch && matchesStatus && matchesTime && matchesVehicle;
    });

    filtered.sort((a: any, b: any) => {
      if (sortOrder === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'OLDEST') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === 'DEPARTURE_ASC') {
        const timeA = a.trips?.departure_time ? new Date(a.trips.departure_time).getTime() : 0;
        const timeB = b.trips?.departure_time ? new Date(b.trips.departure_time).getTime() : 0;
        return timeA - timeB;
      }
      if (sortOrder === 'PRICE_DESC') return b.total_price - a.total_price;
      if (sortOrder === 'PRICE_ASC') return a.total_price - b.total_price;
      return 0;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allBookings, searchTerm, statusFilter, timeFilter, vehicleFilter, sortOrder, sortConfig]);

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
      if (error) throw error;
      setAllBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
      onRefresh();
    } catch (err: any) { alert(err.message); } finally { setActionLoading(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: any) => (
    <th style={{ width }} className={`px-4 py-3 text-[10px] font-bold text-slate-400 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>{label} <ArrowUpDown size={8} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} /></div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-0 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text" placeholder="Tìm đơn, khách, tài xế..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400" 
            />
          </div>
          <UnifiedDropdown 
            label="Sắp xếp theo" icon={ArrowUpDown} value={sortOrder} width="w-56" showCheckbox={false}
            options={[
              { label: 'Mới nhất (Đơn)', value: 'NEWEST' },
              { label: 'Cũ nhất (Đơn)', value: 'OLDEST' },
              { label: 'Khởi hành sớm nhất', value: 'DEPARTURE_ASC' },
              { label: 'Giá cao nhất', value: 'PRICE_DESC' },
              { label: 'Giá thấp nhất', value: 'PRICE_ASC' }
            ]}
            onChange={setSortOrder}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <UnifiedDropdown label="Trạng thái" icon={ShoppingBag} value={statusFilter} onChange={setStatusFilter}
            isStatus={true} statusConfig={statusOptions} width="w-48" showCheckbox={true}
            options={[{label:'Tất cả trạng thái', value:'ALL'}, ...statusOptions]} />
          
          <UnifiedDropdown label="Thời gian" icon={Calendar} value={timeFilter} onChange={setTimeFilter} width="w-48" showCheckbox={true}
            options={[{label:'Tất cả thời gian', value:'ALL'}, {label:'Hôm nay', value:'TODAY'}, {label:'Hôm qua', value:'YESTERDAY'}, {label:'7 ngày qua', value:'WEEK'}]} />

          <UnifiedDropdown label="Loại xe" icon={Car} value={vehicleFilter} onChange={setVehicleFilter} isVehicle={true} width="w-48" showCheckbox={true}
            options={[
              {label:'Tất cả loại xe', value:'ALL'}, 
              {label:'Sedan 4 chỗ', value:'4 chỗ'}, 
              {label:'SUV 7 chỗ', value:'7 chỗ'}, 
              {label:'Limo Green 7 chỗ', value:'Limo Green'},
              {label:'Limousine 9 chỗ', value:'Limousine'}
            ]} />
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-visible min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1250px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Thông tin đơn" sortKey="created_at" width="12%" />
                <SortHeader label="Hành khách" sortKey="passenger_name" width="15%" />
                <SortHeader label="Thông tin xe" sortKey="departure_time" width="15%" />
                <SortHeader label="Phương tiện" sortKey="vehicle_info" width="13%" />
                <SortHeader label="Trạng thái" sortKey="status" width="14%" textAlign="text-center" />
                <SortHeader label="Lộ trình" sortKey="route" width="18%" />
                <SortHeader label="Giá" sortKey="total_price" width="13%" textAlign="text-right" />
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton cols={7} rows={6} />
            ) : (
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.length > 0 ? filteredOrders.map(order => {
                  const trip = order.trips;
                  const depTime = trip?.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const arrTime = trip?.arrival_time ? new Date(trip?.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const depDate = trip?.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
                  const originInfo = parseRouteInfo(trip?.origin_name || '');
                  const destInfo = parseRouteInfo(trip?.dest_name || '');
                  const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
                  const tripCode = trip?.trip_code ? trip.trip_code : `T${trip?.id?.substring(0, 5).toUpperCase() || '---'}`;
                  const isMapVisible = showMapId === order.id;
                  const isExpired = order.status === 'EXPIRED';
                  const createdAt = order.created_at ? new Date(order.created_at) : null;
                  const bookingTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                  const bookingDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';
                  const vConfig = getVehicleConfig(trip?.vehicle_info || '');
                  const VIcon = vConfig.icon;
                  const isPendingLong = order.status === 'PENDING' && (now - new Date(order.created_at).getTime() > 30 * 60 * 1000);

                  const vehicleRaw = trip?.vehicle_info || '';
                  const parts = vehicleRaw.split(' (');
                  const vehicleModel = parts[0] || '---';
                  const licensePlate = parts[1] ? parts[1].replace(')', '') : '';

                  return (
                    <React.Fragment key={order.id}>
                      <tr className={`hover:bg-slate-50/30 transition-colors ${isExpired ? 'opacity-60 grayscale' : ''}`}>
                        <td className="px-4 py-3">
                           <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5 self-start">
                                <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100 shadow-sm">
                                  <Clock size={8} />
                                  <span className="text-[9px] font-black">{bookingTime}</span>
                                </div>
                                <div className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
                                  <Calendar size={8} />
                                  <span className="text-[9px] font-bold">{bookingDate}</span>
                                </div>
                              </div>
                              <div className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 shadow-sm self-start">
                                <CopyableCode code={bookingCode} className="text-[9px] font-black" label={bookingCode} />
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                               <div className="h-[18px] w-[18px] rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-[8px] shrink-0 border border-emerald-100">
                                 {order.profiles?.full_name?.charAt(0)}
                               </div>
                               <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{order.profiles?.full_name}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <a href={`tel:${order.passenger_phone}`} className="w-[18px] h-[18px] bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                 <Phone size={8} />
                               </a>
                               <CopyableCode code={order.passenger_phone || ''} className="text-[9px] font-bold text-indigo-600 truncate" label={order.passenger_phone || '---'} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                           <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5 self-start">
                                <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 shadow-sm">
                                  <Clock size={8} />
                                  <span className="text-[9px] font-black">{depTime}</span>
                                </div>
                                <div className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
                                  <Calendar size={8} />
                                  <span className="text-[9px] font-bold">{depDate}</span>
                                </div>
                              </div>
                              <div className="inline-flex items-center bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 shadow-sm self-start">
                                <CopyableCode code={tripCode} className="text-[9px] font-black" label={tripCode} />
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                             {licensePlate ? (
                                <div className="inline-flex bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm self-start">
                                  <span className="text-[9px] font-black uppercase tracking-wider">{licensePlate}</span>
                                </div>
                             ) : (
                                <span className="text-[9px] font-bold text-slate-300 italic">N/A</span>
                             )}
                             <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-bold self-start ${vConfig.style}`}>
                               <VIcon size={8} />
                               <span className="text-[8px] whitespace-nowrap">{vehicleModel}</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-32 mx-auto relative">
                              {actionLoading === order.id ? <div className="flex items-center justify-center py-1 bg-slate-50 rounded-lg border border-slate-100"><Loader2 className="animate-spin text-indigo-500" size={12} /></div> : <BookingStatusSelector value={order.status} onChange={(newStatus) => handleUpdateStatus(order.id, newStatus)} />}
                            </div>
                            {isPendingLong && !isExpired && <div className="flex items-center gap-1 text-[8px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"><AlertTriangle size={8} /> Hàng chờ {Math.floor((now - new Date(order.created_at).getTime()) / 60000)} phút</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => setShowMapId(isMapVisible ? null : order.id)}>
                          <div className="flex items-center gap-2 pr-6"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{originInfo.huyen}</p><p className="text-[8px] font-bold text-slate-400 truncate">{originInfo.tinh}</p></div><ArrowRight size={8} className="text-slate-300 shrink-0" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-emerald-600 truncate leading-tight">{destInfo.huyen}</p><p className="text-[8px] font-bold text-slate-400 truncate">{destInfo.tinh}</p></div></div>
                        </td>
                        <td className="px-4 py-3 text-right pr-4">
                          <p className="text-[10px] font-bold text-emerald-600 leading-tight">{new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</p>
                          <p className="text-[8px] font-bold text-slate-400 mt-0.5">{order.seats_booked} ghế</p>
                        </td>
                      </tr>
                      {isMapVisible && (
                        <tr className="bg-indigo-50/20 animate-in slide-in-from-top-2 duration-300">
                          <td colSpan={7} className="px-4 py-6 border-t border-indigo-100">
                            <div className="flex flex-col md:flex-row gap-6">
                              <div className="flex-1 h-64 bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
                                <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(trip?.origin_name)}+to+${encodeURIComponent(trip?.dest_name)}&output=embed`} />
                              </div>
                              <div className="w-full md:w-64 space-y-3">
                                <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ghi chú đón trả</p><div className="space-y-2"><div className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0" /><p className="text-[10px] font-bold text-slate-600 leading-tight">{trip?.origin_name}</p></div><div className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" /><p className="text-[10px] font-bold text-emerald-600 leading-tight">{trip?.dest_name}</p></div></div></div>
                                <button onClick={() => setShowMapId(null)} className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Đóng bản đồ</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }) : (
                  <tr><td colSpan={7} className="px-6 py-20 text-center italic text-slate-400 text-[11px] font-bold">Chưa có đơn hàng nào khớp với bộ lọc</td></tr>
                )}
              </tbody>
            )}
          </table>
          <div className="h-40"></div>
        </div>
      </div>
    </div>
  );
};
export default OrderManagement;
