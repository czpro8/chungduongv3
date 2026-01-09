
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, MapPin, Trash2, Map as MapIcon, Navigation, ExternalLink, 
  Calendar, AlertCircle, XCircle, Loader2, CheckCircle2, ArrowUpDown, Search, RefreshCcw, Car, ArrowRight, Ban, Phone, Ticket, ShoppingBag, ListChecks, FileText, User
} from 'lucide-react';
import { Booking, Trip, TripStatus, Profile } from '../types'; 
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig, getTripStatusDisplay } from './SearchTrips';

interface BookingsListProps {
  bookings: Booking[];
  trips: Trip[];
  profile: Profile | null;
  onRefresh?: () => void;
  onViewTripDetails: (trip: Trip) => void;
}

const bookingStatusOptions = [
  { label: 'Chờ duyệt', value: 'PENDING', style: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
  { label: 'Xác nhận', value: 'CONFIRMED', style: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  { label: 'Huỷ', value: 'CANCELLED', style: 'text-rose-600 bg-rose-50 border-rose-100', icon: XCircle }, 
  { label: 'Hết thời hạn', value: 'EXPIRED', style: 'text-slate-600 bg-slate-100 border-slate-200', icon: Ban },
];

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const BookingsList: React.FC<BookingsListProps> = ({ bookings, trips, profile, onRefresh, onViewTripDetails }) => {
  const [viewMode, setViewMode] = useState<'BOOKINGS' | 'MY_POSTS'>('BOOKINGS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // --- Helpers for Bookings ---
  const getTripFromBooking = (booking: any): Trip | null => {
    if (!booking) return null;
    const enrichedTrip = trips.find(t => t.id === booking.trip_id);
    if (enrichedTrip) return enrichedTrip;
    let tripData = booking.trips;
    if (Array.isArray(tripData) && tripData.length > 0) tripData = tripData[0];
    return tripData;
  };

  // --- Handlers ---
  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  // --- Filtering & Sorting for BOOKINGS ---
  const filteredBookings = useMemo(() => {
    const searchNormalized = searchTerm.toLowerCase().trim();
    return bookings.filter(booking => {
      const trip = getTripFromBooking(booking);
      const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
      const tripCode = trip?.trip_code || (trip?.id ? `T${trip.id.substring(0, 5).toUpperCase()}` : '');
      const route = trip ? `${trip.origin_name} ${trip.dest_name}`.toLowerCase() : "";
      const matchesSearch = bookingCode.includes(searchTerm.toUpperCase()) || 
                            tripCode.includes(searchTerm.toUpperCase()) ||
                            route.includes(searchNormalized);
      const matchesStatus = statusFilter.includes('ALL') || statusFilter.includes(booking.status);
      return matchesSearch && matchesStatus;
    });
  }, [bookings, trips, searchTerm, statusFilter]);

  const sortedBookings = useMemo(() => {
    let sorted = [...filteredBookings];
    sorted.sort((a: any, b: any) => {
      if (sortOrder === 'NEWEST') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'DEPARTURE_ASC') {
        const tripA = getTripFromBooking(a);
        const tripB = getTripFromBooking(b);
        const timeA = tripA?.departure_time ? new Date(tripA.departure_time).getTime() : 0;
        const timeB = tripB?.departure_time ? new Date(tripB.departure_time).getTime() : 0;
        return timeA - timeB;
      }
      if (sortOrder === 'PRICE_DESC') return b.total_price - a.total_price;
      return 0;
    });
    return sorted;
  }, [filteredBookings, sortOrder, trips]);

  // --- Filtering & Sorting for MY POSTS ---
  const myPosts = useMemo(() => {
    if (!profile) return [];
    const searchNormalized = searchTerm.toLowerCase().trim();
    
    let posts = trips.filter(t => t.driver_id === profile.id);

    // Filter
    posts = posts.filter(trip => {
       const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
       const route = `${trip.origin_name} ${trip.dest_name}`.toLowerCase();
       const matchesSearch = tripCode.includes(searchTerm.toUpperCase()) || route.includes(searchNormalized);
       // Reuse booking status filter or create new mapping if needed. For now, map TripStatus to fit or just ignore status filter for simplicity or map vaguely
       // Let's implement specific Trip Status filter if 'statusFilter' is used, but statusFilter currently uses Booking Status codes.
       // For simplicity in this view, we'll only filter by search text unless we map statuses.
       return matchesSearch; 
    });

    // Sort
    posts.sort((a, b) => {
       if (sortOrder === 'NEWEST') return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
       if (sortOrder === 'DEPARTURE_ASC') return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
       return 0;
    });

    return posts;
  }, [trips, profile, searchTerm, sortOrder]);

  // --- Actions ---
  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Xác nhận hủy đặt chỗ này?')) return;
    setActionLoading(bookingId);
    try {
      const { data: bookingToCancel, error: fetchBookingError } = await supabase.from('bookings').select('*, trips(id, available_seats, status, departure_time)').eq('id', bookingId).single();
      if (fetchBookingError) throw fetchBookingError;
      
      const trip = Array.isArray(bookingToCancel.trips) ? bookingToCancel.trips[0] : bookingToCancel.trips;
      if (new Date(trip.departure_time) < new Date() || trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
        alert('Không thể hủy đơn của chuyến đã kết thúc/hủy.'); return;
      }

      await supabase.from('bookings').update({ status: 'CANCELLED' }).eq('id', bookingId);
      
      if (bookingToCancel.status === 'CONFIRMED' || bookingToCancel.status === 'PENDING') {
        const newAvailableSeats = trip.available_seats + bookingToCancel.seats_booked;
        let newTripStatus = trip.status;
        if (trip.status === TripStatus.FULL && newAvailableSeats > 0) newTripStatus = TripStatus.PREPARING; // Simplify logic
        await supabase.from('trips').update({ available_seats: newAvailableSeats, status: newTripStatus }).eq('id', trip.id);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) { alert('Lỗi: ' + err.message); } finally { setActionLoading(null); }
  };

  const handleCancelTrip = async (tripId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn huỷ bài đăng này?')) return;
    setActionLoading(tripId);
    try {
        const { error } = await supabase.from('trips').update({ status: TripStatus.CANCELLED }).eq('id', tripId);
        if (error) throw error;
        // Auto cancel bookings? Optional logic.
        if (onRefresh) onRefresh();
    } catch(err: any) { alert('Lỗi: ' + err.message); } finally { setActionLoading(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: any) => (
    <th style={{ width }} className={`px-4 py-3 text-[10px] font-bold text-slate-500 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>{label} <ArrowUpDown size={8} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-40'}`} /></div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      
      {/* View Switcher */}
      <div className="flex justify-center mb-2">
         <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex relative z-30">
            <button 
               onClick={() => setViewMode('BOOKINGS')}
               className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'BOOKINGS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <Ticket size={14} /> Vé đã đặt
            </button>
            <button 
               onClick={() => setViewMode('MY_POSTS')}
               className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'MY_POSTS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
               <FileText size={14} /> Tin đã đăng
            </button>
         </div>
      </div>

      <div className={`p-6 rounded-[32px] border shadow-sm space-y-5 backdrop-blur-sm relative z-30 transition-colors ${viewMode === 'BOOKINGS' ? 'bg-gradient-to-br from-indigo-50/80 to-white border-indigo-100' : 'bg-gradient-to-br from-emerald-50/80 to-white border-emerald-100'}`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative w-full group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors ${viewMode === 'BOOKINGS' ? 'group-focus-within:text-indigo-600' : 'group-focus-within:text-emerald-600'}`} size={16} />
              <input 
                type="text" 
                placeholder={viewMode === 'BOOKINGS' ? "Tìm mã đơn, lộ trình..." : "Tìm mã xe, lộ trình..."}
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-white/80 border border-slate-200 rounded-2xl outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm ${viewMode === 'BOOKINGS' ? 'focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50/50' : 'focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50/50'}`} 
              />
            </div>
            <div className="w-full">
              <UnifiedDropdown 
                label="Sắp xếp theo" icon={ArrowUpDown} value={sortOrder} width="w-full" showCheckbox={false}
                options={[
                  { label: 'Mới nhất', value: 'NEWEST' },
                  { label: 'Khởi hành sớm nhất', value: 'DEPARTURE_ASC' },
                  { label: 'Giá cao nhất', value: 'PRICE_DESC' }
                ]}
                onChange={setSortOrder}
              />
            </div>
          </div>
          
          {viewMode === 'BOOKINGS' && (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-3 w-full">
                <UnifiedDropdown 
                label="Trạng thái" icon={Clock} value={statusFilter} onChange={setStatusFilter} width="w-full lg:w-48" showCheckbox={true}
                isStatus={true}
                statusConfig={bookingStatusOptions}
                options={[
                   {label:'Tất cả trạng thái', value:'ALL'}, 
                   ...bookingStatusOptions
                ]} 
                />
             </div>
          )}
        </div>
      </div>
      
      {/* ----------------- VIEW 1: BOOKINGS LIST ----------------- */}
      {viewMode === 'BOOKINGS' && (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {sortedBookings.length > 0 ? sortedBookings.map(order => {
              const trip = getTripFromBooking(order);
              if (!trip) return null;
              
              const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
              const depTime = trip.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
              const depDate = trip.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
              const statusObj = bookingStatusOptions.find(s => s.value === order.status) || bookingStatusOptions[0];
              const isExpiredOrCancelled = order.status === 'EXPIRED' || order.status === 'CANCELLED';
              const driverName = trip.driver_name || 'Đang cập nhật';
              const driverPhone = (trip as any)?.driver_phone || (trip as any)?.profiles?.phone || '';

              return (
                <div key={order.id} className={`bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden ${isExpiredOrCancelled ? 'opacity-80' : ''}`} onClick={() => onViewTripDetails(trip)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold border ${statusObj.style}`}>
                      <statusObj.icon size={12} /> {statusObj.label}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</p>
                      <p className="text-[10px] text-slate-400 font-bold">{order.seats_booked} ghế</p>
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

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {driverName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-700">{driverName}</p>
                        <CopyableCode code={driverPhone} className="text-[9px] text-indigo-500 font-bold" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyableCode code={bookingCode} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black border border-slate-200" label={bookingCode} />
                      {!isExpiredOrCancelled && (order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCancelBooking(order.id); }} 
                          disabled={actionLoading === order.id} 
                          className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                        >
                          {actionLoading === order.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-10 text-center bg-white rounded-[24px] border border-dashed border-slate-200">
                <Ticket size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400">Chưa có lịch sử chuyến đi</p>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-visible min-h-[400px]">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left table-fixed min-w-[1300px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <SortHeader label="Thông tin đơn" sortKey="created_at" width="14%" />
                    <SortHeader label="Tài xế" sortKey="trip_id" width="14%" />
                    <SortHeader label="Phương tiện" sortKey="trip_id" width="18%" />
                    <SortHeader label="Trạng thái" sortKey="status" width="10%" textAlign="text-center" />
                    <SortHeader label="Điểm đón" sortKey="trip_id" width="16%" />
                    <SortHeader label="Điểm đến" sortKey="trip_id" width="16%" />
                    <SortHeader label="Giá" sortKey="total_price" width="12%" textAlign="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedBookings.length > 0 ? sortedBookings.map(order => {
                    const trip = getTripFromBooking(order);
                    if (!trip) return null;
                    // ... (Variables extraction same as original, shortened for brevity)
                    const depTime = new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                    const depDate = new Date(trip.departure_time).toLocaleDateString('vi-VN');
                    const arrTime = trip.arrival_time ? new Date(trip.arrival_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                    const arrDate = trip.arrival_time ? new Date(trip.arrival_time).toLocaleDateString('vi-VN') : '--/--/----';
                    const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
                    const createdAt = new Date(order.created_at);
                    const bookingTime = createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'});
                    const bookingDate = createdAt.toLocaleDateString('vi-VN');
                    const driverName = trip.driver_name || 'Đang cập nhật';
                    const driverPhone = (trip as any)?.driver_phone || (trip as any)?.profiles?.phone || '';
                    const vConfig = getVehicleConfig(trip.vehicle_info || '');
                    const statusObj = bookingStatusOptions.find(s => s.value === order.status) || bookingStatusOptions[0];
                    const StatusIcon = statusObj.icon;
                    const isExpiredOrCancelled = order.status === 'EXPIRED' || order.status === 'CANCELLED';

                    return (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-slate-50/30 transition-colors group/row cursor-pointer ${isExpiredOrCancelled ? 'opacity-90' : ''}`} 
                        onClick={() => onViewTripDetails(trip)}
                      >
                        <td className="px-4 py-3 pr-6">
                          <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5 self-start flex-wrap">
                                <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100 shadow-sm">
                                  <Clock size={8} /> <span className="text-[9px] font-black">{bookingTime}</span>
                                </div>
                                <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                  <Calendar size={8} /> <span className="text-[9px] font-bold">{bookingDate}</span>
                                </div>
                              </div>
                              <div className="inline-flex items-center bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md border border-cyan-200 shadow-sm self-start group">
                                <CopyableCode code={bookingCode} className="text-[9px] font-black" label={bookingCode} />
                              </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-[18px] w-[18px] rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-[8px] shrink-0 border border-emerald-100">{driverName?.charAt(0)}</div>
                              <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{driverName}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <a href={`tel:${driverPhone}`} onClick={(e) => e.stopPropagation()} className="w-[18px] h-[18px] bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0"><Phone size={8} /></a>
                              <div className="group" onClick={(e) => e.stopPropagation()}><CopyableCode code={driverPhone} className="text-[9px] font-bold text-indigo-600 truncate" label={driverPhone || '---'} /></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-bold ${vConfig.style} self-start whitespace-nowrap`}>
                                <vConfig.icon size={8} /> <span className="text-[8px]">{trip.vehicle_info.split(' (')[0]}</span>
                              </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border shadow-sm ${statusObj.style} whitespace-nowrap`}>
                              <StatusIcon size={12} /> {statusObj.label}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5 self-start flex-wrap">
                                <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 shadow-sm"><Clock size={8} /><span className="text-[9px] font-black">{depTime}</span></div>
                                <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /><span className="text-[9px] font-bold">{depDate}</span></div>
                              </div>
                              <p className="text-[10px] font-bold text-slate-800 truncate leading-tight mt-0.5 pr-1">{trip.origin_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5 self-start flex-wrap">
                                <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm"><Clock size={8} /><span className="text-[9px] font-black">{arrTime}</span></div>
                                <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"><Calendar size={8} /><span className="text-[9px] font-bold">{arrDate}</span></div>
                              </div>
                              <p className="text-[10px] font-bold text-emerald-600 truncate leading-tight mt-0.5 pr-1">{trip.dest_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right pr-4">
                          <p className="text-[10px] font-bold text-emerald-600 leading-tight">{new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</p>
                          <p className="text-[8px] font-bold text-slate-500 mt-0.5">{order.seats_booked} ghế</p>
                          {!isExpiredOrCancelled && (order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                            <button onClick={(e) => { e.stopPropagation(); handleCancelBooking(order.id); }} disabled={actionLoading === order.id} className="mt-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover/row:opacity-100" title="Hủy đơn">
                              {actionLoading === order.id ? <Loader2 className="animate-spin" size={10} /> : <Trash2 size={10} />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={7} className="px-6 py-20 text-center italic text-slate-500 text-[11px] font-bold">Bạn chưa thực hiện chuyến đi nào</td></tr>
                  )}
                </tbody>
              </table>
              <div className="h-40"></div>
            </div>
          </div>
        </>
      )}

      {/* ----------------- VIEW 2: MY POSTS LIST ----------------- */}
      {viewMode === 'MY_POSTS' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {myPosts.length > 0 ? myPosts.map(trip => {
               const statusInfo = getTripStatusDisplay(trip);
               const StatusIcon = statusInfo.icon;
               const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
               const isRequest = trip.is_request;
               const isCancelled = trip.status === TripStatus.CANCELLED;
               
               return (
                  <div key={trip.id} className={`bg-white p-5 rounded-[28px] border shadow-sm relative group ${isCancelled ? 'opacity-75 border-slate-100 bg-slate-50' : 'border-emerald-100 hover:shadow-xl hover:-translate-y-1 transition-all'}`}>
                     
                     <div className="flex justify-between items-start mb-3">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold border ${statusInfo.style}`}>
                           <StatusIcon size={12} /> {statusInfo.label}
                        </div>
                        <div className="flex items-center gap-2">
                           <CopyableCode code={tripCode} label={tripCode} className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-lg" />
                           {!isCancelled && trip.status !== TripStatus.COMPLETED && (
                              <button onClick={() => handleCancelTrip(trip.id)} disabled={actionLoading === trip.id} className="p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors">
                                 {actionLoading === trip.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                              </button>
                           )}
                        </div>
                     </div>

                     <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isRequest ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                              {isRequest ? <User size={16} /> : <Car size={16} />}
                           </div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{isRequest ? 'Yêu cầu tìm xe' : 'Chuyến xe cho đi nhờ'}</p>
                              <p className="text-xs font-black text-slate-800">{new Intl.NumberFormat('vi-VN').format(trip.price)}đ / {isRequest ? 'người' : 'ghế'}</p>
                           </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-50">
                           <div className="flex items-start gap-2">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                 <p className="text-[11px] font-bold text-slate-700 truncate">{trip.origin_name}</p>
                                 <p className="text-[9px] font-bold text-indigo-500 mt-0.5">{new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} • {new Date(trip.departure_time).toLocaleDateString('vi-VN')}</p>
                              </div>
                           </div>
                           <div className="flex items-start gap-2">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                 <p className="text-[11px] font-bold text-slate-700 truncate">{trip.dest_name}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <button 
                        onClick={() => onViewTripDetails(trip)}
                        className="w-full py-2.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
                     >
                        <ListChecks size={14} /> Quản lý chi tiết
                     </button>
                  </div>
               );
            }) : (
               <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                  <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-xs font-bold text-slate-400 uppercase">Bạn chưa đăng tin nào</p>
               </div>
            )}
         </div>
      )}
    </div>
  );
};
export default BookingsList;
