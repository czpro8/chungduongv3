
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Car, MapPin, Clock, Users, DollarSign, Calendar, Navigation, CheckCircle2, AlertCircle, Play, Timer, Ban, Phone, ArrowRight, Loader2, ListChecks, LucideIcon, Hash, CarFront, Zap, Crown, Shield, Trash2, Star, Radio, ArrowUpDown, Filter, Sparkles
} from 'lucide-react';
import { Trip, Booking, Profile, UserRole, TripStatus } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { getVehicleConfig, getTripStatusDisplay } from './SearchTrips';
import { BookingStatusSelector } from './OrderManagement';

interface TripDetailModalProps {
  trip: Trip | null;
  currentBookings: Booking[];
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

const TripDetailModal: React.FC<TripDetailModalProps> = ({ trip, currentBookings, profile, isOpen, onClose, onRefresh }) => {
  const [actionLoadingBooking, setActionLoadingBooking] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('ALL');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const filteredAndSortedBookings = useMemo(() => {
    let result = [...currentBookings];
    
    // Filter by status
    if (bookingStatusFilter !== 'ALL') {
      result = result.filter(b => b.status === bookingStatusFilter);
    }

    // Sort
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'full_name') {
          valA = a.profiles?.full_name || '';
          valB = b.profiles?.full_name || '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [currentBookings, sortConfig, bookingStatusFilter]);

  if (!isOpen || !trip) return null;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const isDriver = profile?.role === 'driver';
  const isTripOwner = trip.driver_id === profile?.id;
  const canManage = isAdmin || (isDriver && isTripOwner);

  const tripCode = trip.trip_code || `T${trip.id.substring(0, 5).toUpperCase()}`;
  const statusInfo = getTripStatusDisplay(trip);
  const StatusIcon = statusInfo.icon;
  const departureDate = new Date(trip.departure_time);
  const arrivalDateObj = trip.arrival_time ? new Date(trip.arrival_time) : new Date(departureDate.getTime() + 3 * 60 * 60 * 1000);

  const depTime = departureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const depDate = departureDate.toLocaleDateString('vi-VN');
  const arrTime = arrivalDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const arrDate = arrivalDateObj.toLocaleDateString('vi-VN');

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(trip.origin_name)}+to+${encodeURIComponent(trip.dest_name)}&output=embed`;

  const totalBookedSeats = currentBookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').reduce((sum, b) => sum + b.seats_booked, 0);
  const fillPercent = ((trip.seats - trip.available_seats) / trip.seats) * 100;
  
  const vehicleRaw = trip.vehicle_info || '';
  const vehicleParts = vehicleRaw.split(' (');
  const vehicleModel = vehicleParts[0] || '---';
  const licensePlate = vehicleParts[1] ? vehicleParts[1].replace(')', '') : '';
  const vehicleConfig = getVehicleConfig(vehicleModel);
  const VIcon = vehicleConfig.icon;

  let fillBarColor = 'bg-emerald-500';
  if (fillPercent >= 50 && fillPercent < 100) fillBarColor = 'bg-amber-500';
  else if (fillPercent >= 100) fillBarColor = 'bg-rose-500';

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    setActionLoadingBooking(bookingId);
    try {
      const { data: currentBooking, error: fetchBookingError } = await supabase
        .from('bookings')
        .select('*, trips(id, available_seats, status, departure_time)')
        .eq('id', bookingId)
        .single();

      if (fetchBookingError) throw fetchBookingError;
      const currentTrip = Array.isArray(currentBooking.trips) ? currentBooking.trips[0] : currentBooking.trips;
      const seatsBooked = currentBooking.seats_booked;
      const oldBookingStatus = currentBooking.status;
      let newAvailableSeats = currentTrip.available_seats;
      let newTripStatus = currentTrip.status;
      const now = new Date();
      const departureTime = new Date(currentTrip.departure_time);

      if (departureTime < now || currentTrip.status === TripStatus.COMPLETED || currentTrip.status === TripStatus.CANCELLED) {
        alert('Không thể thay đổi trạng thái đơn cho chuyến xe đã kết thúc hoặc đã hủy.');
        return;
      }

      if (newStatus === 'CONFIRMED' && (oldBookingStatus === 'PENDING' || oldBookingStatus === 'CANCELLED' || oldBookingStatus === 'EXPIRED')) {
        newAvailableSeats = currentTrip.available_seats - seatsBooked;
      } else if ((newStatus === 'CANCELLED' || newStatus === 'EXPIRED') && (oldBookingStatus === 'PENDING' || oldBookingStatus === 'CONFIRMED')) {
        newAvailableSeats = currentTrip.available_seats + seatsBooked;
      }

      if (newAvailableSeats < 0) {
        alert('Không đủ chỗ trống để xác nhận đơn hàng này.');
        return;
      }

      if (newAvailableSeats <= 0) newTripStatus = TripStatus.FULL;
      else if (newAvailableSeats > 0 && newTripStatus === TripStatus.FULL) newTripStatus = TripStatus.PREPARING;

      await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
      await supabase.from('trips').update({ available_seats: newAvailableSeats, status: newTripStatus }).eq('id', currentTrip.id);
      onRefresh();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoadingBooking(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string, seatsBooked: number, currentBookingStatus: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;
    setActionLoadingBooking(bookingId);
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw error;
      if (currentBookingStatus === 'CONFIRMED' || currentBookingStatus === 'PENDING') {
        await supabase.from('trips').update({ available_seats: trip.available_seats + seatsBooked }).eq('id', trip.id);
      }
      onRefresh();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoadingBooking(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: string, width?: string, textAlign?: string }) => (
    <th 
      style={{ width }} 
      className={`px-4 py-3 text-[9px] font-bold text-slate-400 cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        ref={modalRef} 
        className="bg-white w-full max-w-6xl h-[95vh] rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col relative border border-white/20"
      >
        {/* Nút đóng nổi */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-10 h-10 bg-white shadow-xl text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all duration-300 z-[160] border border-slate-100"
        >
          <X size={20} strokeWidth={3} />
        </button>

        {/* Frame 1: Trip Info - Chiếm 2/5 (40%) */}
        <div className="flex-none lg:h-[40%] min-h-0 flex flex-col p-4 overflow-hidden bg-gradient-to-r from-emerald-50/40 to-indigo-50/30 border-b border-slate-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-y-auto lg:overflow-visible">
            
            {/* Cột trái: Thông tin xe - Style nhỏ gọn hơn để vừa 40% */}
            <div className="lg:col-span-4 bg-gradient-to-br from-white via-white to-emerald-50/60 p-5 rounded-[32px] border border-emerald-100 shadow-sm flex flex-col relative overflow-hidden group backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold ${statusInfo.style}`}>
                  {trip.status === TripStatus.ON_TRIP ? <Radio size={10} className="animate-pulse" /> : <StatusIcon size={10} />}
                  {statusInfo.label}
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-bold text-slate-500">{trip.available_seats}/{trip.seats} ghế</span>
                  <div className="w-16 bg-slate-200 h-1 rounded-full overflow-hidden mt-0.5">
                    <div className={`h-full rounded-full transition-all duration-500 ${fillBarColor}`} style={{ width: `${fillPercent}%` }}></div>
                  </div>
                </div>
                <p className="text-sm font-bold text-emerald-600 tracking-tight">
                  {new Intl.NumberFormat('vi-VN').format(trip.price)}đ
                </p>
              </div>

              <div className="flex flex-col gap-1 items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-emerald-100 shrink-0">
                    {trip.driver_name?.charAt(0) || 'T'}
                  </div>
                  <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate">{trip.driver_name}</h4>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap pl-0.5">
                  <Sparkles size={10} className="text-emerald-500" />
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-bold truncate ${vehicleConfig.style} flex-shrink-0 min-w-0`}>
                    <VIcon size={10} /> {vehicleModel}
                  </span>
                  {licensePlate && (
                    <div className="inline-flex items-center bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap">
                      <CopyableCode code={licensePlate} className="text-[10px] font-black uppercase tracking-wider" label={licensePlate} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-3 relative flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-emerald-100"></div> 
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 border-2 border-indigo-500 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  </div>
                  <div className="flex flex-col">
                    <p className="font-bold text-slate-700 text-[11px] truncate leading-tight">{trip.origin_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-100 shadow-sm">
                        <Clock size={8} /> <span className="text-[9px] font-black">{depTime}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{depDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 border-2 border-emerald-500 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  </div>
                  <div className="flex flex-col">
                    <p className="font-bold text-slate-700 text-[11px] truncate leading-tight">{trip.dest_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                        <Clock size={8} /> <span className="text-[9px] font-black">{arrTime}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{arrDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center mt-auto">
                <div className="inline-flex items-center bg-rose-50 text-rose-600 px-3 py-1 rounded-lg border border-rose-100 shadow-sm">
                  <CopyableCode code={tripCode} className="text-[10px] font-black" label={tripCode} />
                </div>
                {trip.driver_phone && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <Phone size={10} />
                    </div>
                    <CopyableCode code={trip.driver_phone} className="text-[11px] font-bold text-indigo-600" label={trip.driver_phone} />
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Bản đồ */}
            <div className="lg:col-span-8 bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-sm relative h-48 lg:h-full hidden md:block">
              <iframe width="100%" height="100%" frameBorder="0" src={mapUrl} className="grayscale-[0.1] contrast-[1.05]" />
              <div className="absolute top-4 right-14 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-2xl text-[11px] font-black text-slate-600 border border-slate-200 shadow-md">
                Lộ trình chi tiết Google Maps
              </div>
            </div>
          </div>
        </div>

        {/* Frame 2: Order Management - Chiếm 3/5 (60%) */}
        <div className="flex-1 lg:h-[60%] min-h-0 flex flex-col bg-white overflow-hidden">
          {/* Sub-header: Booking Filter */}
          <div className="px-4 md:px-8 py-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/40 to-indigo-50/40 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
                <ListChecks size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Danh sách hành khách</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Quản lý duyệt đơn ({filteredAndSortedBookings.length})</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm w-full md:w-auto hover:border-emerald-300 transition-colors">
                <Filter size={12} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Trạng thái:</span>
                <select 
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-emerald-600 outline-none cursor-pointer w-full"
                >
                  <option value="ALL">Tất cả đơn hàng</option>
                  <option value="PENDING">Đang chờ duyệt</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="CANCELLED">Đã hủy bỏ</option>
                  <option value="EXPIRED">Đã hết hạn</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 bg-slate-50 md:bg-white">
            {filteredAndSortedBookings.length > 0 ? (
              <>
                {/* Mobile View: Cards */}
                <div className="block md:hidden space-y-3 p-2">
                  {filteredAndSortedBookings.map((booking: any) => {
                    const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                    const isLoading = actionLoadingBooking === booking.id;
                    const createdAt = booking.created_at ? new Date(booking.created_at) : null;
                    const bTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                    const bDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';

                    return (
                      <div key={booking.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-[10px] shrink-0 border border-emerald-100">
                              {booking.profiles?.full_name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{booking.profiles?.full_name || 'Khách vãng lai'}</p>
                              <CopyableCode code={bookingCode} className="text-[9px] font-bold text-slate-400" label={bookingCode} />
                            </div>
                          </div>
                          <div className="w-28" onClick={(e) => e.stopPropagation()}>
                            {isLoading ? (
                              <Loader2 className="animate-spin text-indigo-500" size={14} />
                            ) : (
                              <BookingStatusSelector 
                                value={booking.status} 
                                onChange={(newStatus) => handleUpdateBookingStatus(booking.id, newStatus)} 
                                disabled={trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED}
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center py-2 border-t border-b border-slate-50 mb-3">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <Clock size={12} className="text-emerald-500" /> {bTime} - {bDate}
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</span>
                            <span className="text-[9px] font-bold text-slate-400 ml-1">({booking.seats_booked} ghế)</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600">
                            <Phone size={12} /> {booking.passenger_phone || '---'}
                          </div>
                          <button 
                            onClick={() => handleDeleteBooking(booking.id, booking.seats_booked, booking.status)}
                            className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 sticky top-0 z-10">
                        <SortHeader label="Thông tin đơn" sortKey="created_at" width="14%" />
                        <SortHeader label="Hành khách" sortKey="full_name" width="18%" />
                        <SortHeader label="Trạng thái đơn" sortKey="status" width="16%" textAlign="text-center" />
                        <SortHeader label="Điểm đón" sortKey="trip_id" width="18%" />
                        <SortHeader label="Điểm đến" sortKey="trip_id" width="18%" />
                        <SortHeader label="Giá" sortKey="total_price" width="10%" textAlign="text-right" />
                        <th className="px-4 py-3 text-[9px] font-bold text-slate-400 text-right pr-10">Tác vụ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredAndSortedBookings.map((booking: any) => {
                        const bookingCode = `S${booking.id.substring(0, 5).toUpperCase()}`;
                        const isLoading = actionLoadingBooking === booking.id;
                        const createdAt = booking.created_at ? new Date(booking.created_at) : null;
                        const bTime = createdAt ? createdAt.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                        const bDate = createdAt ? createdAt.toLocaleDateString('vi-VN') : '--/--/----';

                        return (
                          <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-black text-amber-600">{bTime}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{bDate}</span>
                                </div>
                                <div className="inline-flex items-center bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md border border-cyan-200 self-start">
                                  <CopyableCode code={bookingCode} className="text-[10px] font-black" label={bookingCode} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="h-[22px] w-[22px] rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-[9px] shrink-0 border border-emerald-100">
                                    {booking.profiles?.full_name?.charAt(0) || 'P'}
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{booking.profiles?.full_name || 'Khách vãng lai'}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {booking.passenger_phone && (
                                    <a href={`tel:${booking.passenger_phone}`} className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                      <Phone size={10} />
                                    </a>
                                  )}
                                  <CopyableCode code={booking.passenger_phone || ''} className="text-[10px] font-bold text-indigo-600 truncate" label={booking.passenger_phone || '---'} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="w-32 mx-auto">
                                {isLoading ? (
                                  <Loader2 className="animate-spin text-indigo-500" size={14} />
                                ) : (
                                  <BookingStatusSelector 
                                    value={booking.status} 
                                    onChange={(newStatus) => handleUpdateBookingStatus(booking.id, newStatus)} 
                                    disabled={trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED}
                                  />
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5 self-start flex-wrap">
                                    <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md border border-indigo-100 shadow-sm">
                                      <Clock size={8} />
                                      <span className="text-[10px] font-black">{depTime}</span>
                                    </div>
                                    <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                      <Calendar size={8} />
                                      <span className="text-[10px] font-bold">{depDate}</span>
                                    </div>
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-800 truncate leading-tight mt-0.5 pr-1">
                                    {trip.origin_name}
                                  </p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-1.5 self-start flex-wrap">
                                    <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                                      <Clock size={8} />
                                      <span className="text-[10px] font-black">{arrTime}</span>
                                    </div>
                                    <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">
                                      <Calendar size={8} />
                                      <span className="text-[10px] font-bold">{arrDate}</span>
                                    </div>
                                  </div>
                                  <p className="text-[11px] font-bold text-emerald-600 truncate leading-tight mt-0.5 pr-1">
                                    {trip.dest_name}
                                  </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <p className="text-[11px] font-black text-emerald-600">{new Intl.NumberFormat('vi-VN').format(booking.total_price)}đ</p>
                              <p className="text-[9px] font-bold text-slate-400">{booking.seats_booked} ghế</p>
                            </td>
                            <td className="px-4 py-4 text-right pr-10">
                              <button 
                                onClick={() => handleDeleteBooking(booking.id, booking.seats_booked, booking.status)}
                                className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100 opacity-0 group-hover:opacity-100 shadow-sm"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                <Users className="text-slate-100" size={80} />
                <p className="text-[12px] font-bold text-slate-300 uppercase mt-4 tracking-widest">Không có khách đặt chuyến này</p>
              </div>
            )}
          </div>
          
          {/* Footer tóm tắt - Nâng cấp tinh tế */}
          <div className="px-4 md:px-8 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center shrink-0 gap-3">
             <div className="flex items-center gap-4 md:gap-8 justify-center w-full md:w-auto">
                <div className="flex items-center gap-2 md:gap-3">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                   <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đã lấp đầy: <span className="text-indigo-600 text-[12px] md:text-[14px] ml-1 md:ml-2 font-black">{totalBookedSeats}/{trip.seats} Ghế</span></span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex items-center gap-2 md:gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                   <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tổng thu: <span className="text-emerald-600 text-[12px] md:text-[14px] ml-1 md:ml-2 font-black">{new Intl.NumberFormat('vi-VN').format(currentBookings.reduce((sum, b) => sum + (b.status === 'CONFIRMED' ? b.total_price : 0), 0))}đ</span></span>
                </div>
             </div>
             
             <div className="flex items-center gap-4 hidden md:flex">
                <p className="text-[10px] font-bold text-slate-300 italic">Dữ liệu được cập nhật thời gian thực</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailModal;
