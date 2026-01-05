
import React, { useState, useMemo, useEffect } from 'react';
import { Booking, Trip } from '../types';
import { 
  Clock, MapPin, Trash2, Map as MapIcon, Navigation, ExternalLink, 
  Calendar, AlertCircle, XCircle, Loader2, CheckCircle2, ArrowUpDown, Search, RefreshCcw, Car, ArrowRight, Ban, Phone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { UnifiedDropdown, getVehicleConfig } from './SearchTrips';

interface BookingsListProps {
  bookings: Booking[];
  trips: Trip[];
  onRefresh?: () => void;
}

const bookingStatusOptions = [
  { label: 'Chờ duyệt', value: 'PENDING', style: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
  { label: 'Xác nhận', value: 'CONFIRMED', style: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
  { label: 'Từ chối', value: 'REJECTED', style: 'text-rose-600 bg-rose-50 border-rose-100', icon: XCircle },
  { label: 'Hết thời hạn', value: 'EXPIRED', style: 'text-slate-600 bg-slate-100 border-slate-200', icon: Ban },
];

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const BookingsList: React.FC<BookingsListProps> = ({ bookings, trips, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMapId, setShowMapId] = useState<string | null>(null);

  const getTripFromBooking = (booking: any): Trip | null => {
    if (!booking) return null;
    const enrichedTrip = trips.find(t => t.id === booking.trip_id);
    if (enrichedTrip) return enrichedTrip;
    let tripData = booking.trips;
    if (Array.isArray(tripData) && tripData.length > 0) tripData = tripData[0];
    return tripData;
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

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

    if (sortConfig.key && sortConfig.direction) {
      sorted.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredBookings, sortOrder, sortConfig, trips]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Xác nhận hủy yêu cầu đặt chỗ này?')) return;
    setActionLoading(bookingId);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'REJECTED' }).eq('id', bookingId);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err: any) { alert('Lỗi: ' + err.message); } finally { setActionLoading(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: any) => (
    <th style={{ width }} className={`px-4 py-3 text-[10px] font-bold text-slate-500 tracking-tight cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>{label} <ArrowUpDown size={8} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-40'}`} /></div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full min-w-0 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Tìm mã đơn, lộ trình..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-400 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-500" 
            />
          </div>
          <UnifiedDropdown 
            label="Sắp xếp theo" icon={ArrowUpDown} value={sortOrder} width="w-56" showCheckbox={false}
            options={[
              { label: 'Mới nhất (Đơn)', value: 'NEWEST' },
              { label: 'Khởi hành sớm nhất', value: 'DEPARTURE_ASC' },
              { label: 'Giá cao nhất', value: 'PRICE_DESC' }
            ]}
            onChange={setSortOrder}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <UnifiedDropdown 
            label="Trạng thái" icon={Clock} value={statusFilter} onChange={setStatusFilter} width="w-52" showCheckbox={true}
            isStatus={true}
            statusConfig={bookingStatusOptions}
            options={[
              {label:'Tất cả trạng thái', value:'ALL'}, 
              ...bookingStatusOptions
            ]} 
          />
        </div>
      </div>
      
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-visible min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Thông tin đơn" sortKey="created_at" width="13%" />
                <SortHeader label="Tài xế" sortKey="trip_id" width="16%" />
                <SortHeader label="Phương tiện" sortKey="trip_id" width="20%" />
                <SortHeader label="Điểm đón" sortKey="trip_id" width="15%" />
                <SortHeader label="Điểm đến" sortKey="trip_id" width="15%" />
                <SortHeader label="Trạng thái" sortKey="status" width="11%" textAlign="text-center" />
                <SortHeader label="Giá" sortKey="total_price" width="10%" textAlign="text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBookings.length > 0 ? filteredBookings.map(order => {
                const trip = getTripFromBooking(order);
                const depTime = trip?.departure_time ? new Date(trip.departure_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const depDate = trip?.departure_time ? new Date(trip.departure_time).toLocaleDateString('vi-VN') : '--/--/----';
                
                const arrivalDateObj = trip?.arrival_time ? new Date(trip.arrival_time) : null;
                const arrTime = arrivalDateObj ? arrivalDateObj.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const arrDate = arrivalDateObj ? arrivalDateObj.toLocaleDateString('vi-VN') : '--/--/----';

                const bookingCode = `S${order.id.substring(0, 5).toUpperCase()}`;
                const isMapVisible = showMapId === order.id;
                
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const bookingTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                const bookingDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';
                
                const driverName = trip?.driver_name || (trip as any)?.profiles?.full_name || 'Đang cập nhật';
                const driverPhone = (trip as any)?.driver_phone || (trip as any)?.profiles?.phone || '';
                
                const vConfig = getVehicleConfig(trip?.vehicle_info || '');
                const VIcon = vConfig.icon;
                const vehicleRaw = trip?.vehicle_info || '';
                const vehicleParts = vehicleRaw.split(' (');
                const vehicleModel = vehicleParts[0] || '---';
                const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';

                const statusObj = bookingStatusOptions.find(s => s.value === order.status) || bookingStatusOptions[0];
                const StatusIcon = statusObj.icon;

                if (!trip) return null;

                return (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-slate-50/30 transition-colors group/row cursor-pointer" onClick={() => setShowMapId(isMapVisible ? null : order.id)}>
                      <td className="px-4 py-3 pr-6">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 self-start flex-wrap">
                              <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md border border-amber-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[9px] font-black">{bookingTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[9px] font-bold">{bookingDate}</span>
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
                             <div className="h-[18px] w-[18px] rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-[8px] shrink-0 border border-emerald-100">
                                {driverName?.charAt(0)}
                             </div>
                             <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{driverName}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <a href={`tel:${driverPhone}`} className="w-[18px] h-[18px] bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                               <Phone size={8} />
                             </a>
                             <div className="group">
                               <CopyableCode code={driverPhone} className="text-[9px] font-bold text-indigo-600 truncate" label={driverPhone || '---'} />
                             </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="flex flex-col gap-1.5">
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
                      <td className="px-4 py-3">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 self-start flex-wrap">
                              <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[9px] font-black">{depTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[9px] font-bold">{depDate}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-800 truncate leading-tight mt-0.5 pr-1">
                              {trip.origin_name}
                            </p>
                         </div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 self-start flex-wrap">
                              <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                                <Clock size={8} />
                                <span className="text-[9px] font-black">{arrTime}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                <Calendar size={8} />
                                <span className="text-[9px] font-bold">{arrDate}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-emerald-600 truncate leading-tight mt-0.5 pr-1">
                              {trip.dest_name}
                            </p>
                         </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border shadow-sm ${statusObj.style} whitespace-nowrap`}>
                            <StatusIcon size={12} />
                            {statusObj.label}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right pr-4">
                        <p className="text-[10px] font-bold text-emerald-600 leading-tight">{new Intl.NumberFormat('vi-VN').format(order.total_price)}đ</p>
                        <p className="text-[8px] font-bold text-slate-500 mt-0.5">{order.seats_booked} ghế</p>
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
                              <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Thông tin đón trả</p>
                                <div className="space-y-2">
                                  <div className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1 shrink-0" /><p className="text-[10px] font-bold text-slate-700 leading-tight">{trip?.origin_name}</p></div>
                                  <div className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" /><p className="text-[10px] font-bold text-emerald-600 leading-tight">{trip?.dest_name}</p></div>
                                </div>
                              </div>
                              {order.status === 'PENDING' && (
                                <button onClick={(e) => { e.stopPropagation(); handleCancelBooking(order.id); }} className="w-full py-2 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-xl border border-rose-100 hover:bg-rose-600 hover:text-white transition-all">Hủy yêu cầu đặt chỗ</button>
                              )}
                              <button onClick={() => setShowMapId(null)} className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Đóng chi tiết</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }) : (
                <tr><td colSpan={7} className="px-6 py-20 text-center italic text-slate-500 text-[11px] font-bold">Bạn chưa thực hiện chuyến đi nào</td></tr>
              )}
            </tbody>
          </table>
          <div className="h-40"></div>
        </div>
      </div>
    </div>
  );
};
export default BookingsList;
