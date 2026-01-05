
import React, { useState, useEffect, useRef } from 'react';
import { Send, MapPin, Calendar, Users, Car, CheckCircle2, Navigation, Clock, Repeat, ChevronDown, Banknote, Loader2, AlertTriangle, Info, ArrowRight, DollarSign, Check, Map as MapIcon, Timer } from 'lucide-react';
import { searchPlaces, getRouteDetails } from '../services/geminiService.ts';
import CustomDatePicker from './CustomDatePicker.tsx';
import CustomTimePicker from './CustomTimePicker.tsx';
import { getVehicleConfig } from './SearchTrips.tsx';

interface PostTripProps {
  onPost: (trips: any[]) => void;
}

const DAYS_OF_WEEK = [
  { label: 'T2', value: 1 }, { label: 'T3', value: 2 }, { label: 'T4', value: 3 },
  { label: 'T5', value: 4 }, { label: 'T6', value: 5 }, { label: 'T7', value: 6 }, { label: 'CN', value: 0 },
];

const vehicleOptions = [
  { label: 'Sedan 4 chỗ', value: 'Sedan 4 chỗ' },
  { label: 'SUV 7 chỗ', value: 'SUV 7 chỗ' },
  { label: 'Limo Green 7 chỗ', value: 'Limo Green 7 chỗ' },
  { label: 'Limousine 9 chỗ', value: 'Limousine 9 chỗ' },
];

const getTodayFormatted = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
};

const priceSuggestions = [
  { label: '100K', value: 100000 },
  { label: '150K', value: 150000 },
  { label: '200K', value: 200000 },
  { label: '250K', value: 250000 },
  { label: '300K', value: 300000 },
];

const PostTrip: React.FC<PostTripProps> = ({ onPost }) => {
  const [origin, setOrigin] = useState('');
  const [originDetail, setOriginDetail] = useState('');
  const [destination, setDestination] = useState('');
  const [destDetail, setDestDetail] = useState('');
  const [originUri, setOriginUri] = useState('');
  const [destUri, setDestUri] = useState('');
  
  const [vehicle, setVehicle] = useState('Sedan 4 chỗ');
  const [licensePlate, setLicensePlate] = useState('');
  const [date, setDate] = useState(getTodayFormatted());
  const [time, setTime] = useState('08:00');
  const [arrivalTime, setArrivalTime] = useState('10:00');
  const [seats, setSeats] = useState(4);
  const [price, setPrice] = useState('150000'); 
  const [loading, setLoading] = useState(false);
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showSeatsPicker, setShowSeatsPicker] = useState(false);
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  const [originSuggestions, setOriginSuggestions] = useState<{name: string, uri: string}[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<{name: string, uri: string}[]>([]);
  
  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const arrivalTimePickerRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const vehiclePickerRef = useRef<HTMLDivElement>(null);
  const seatsPickerRef = useRef<HTMLDivElement>(null);

  const formatNumber = (num: string) => {
    if (!num) return "";
    const value = num.replace(/\D/g, "");
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setShowDatePicker(false);
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) setShowTimePicker(false);
      if (arrivalTimePickerRef.current && !arrivalTimePickerRef.current.contains(event.target as Node)) setShowArrivalTimePicker(false);
      if (vehiclePickerRef.current && !vehiclePickerRef.current.contains(event.target as Node)) setShowVehiclePicker(false);
      if (seatsPickerRef.current && !seatsPickerRef.current.contains(event.target as Node)) setShowSeatsPicker(false);
      if (originRef.current && !originRef.current.contains(event.target as Node)) setOriginSuggestions([]);
      if (destRef.current && !destRef.current.contains(event.target as Node)) setDestSuggestions([]);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (origin.length >= 1 && !originUri) setOriginSuggestions(await searchPlaces(origin));
      else setOriginSuggestions([]);
    };
    search();
  }, [origin, originUri]);

  useEffect(() => {
    const search = async () => {
      if (destination.length >= 1 && !destUri) setDestSuggestions(await searchPlaces(destination));
      else setDestSuggestions([]);
    };
    search();
  }, [destination, destUri]);

  useEffect(() => {
    const analyze = async () => {
      if (origin && destination && origin !== destination) {
        setAnalyzingRoute(true);
        const data = await getRouteDetails(origin, destination);
        setRouteData(data);
        
        if (data && data.duration_minutes) {
          const [h, m] = time.split(':').map(Number);
          const depDate = new Date();
          depDate.setHours(h, m, 0, 0);
          const arrDate = new Date(depDate.getTime() + data.duration_minutes * 60000);
          setArrivalTime(`${String(arrDate.getHours()).padStart(2, '0')}:${String(arrDate.getMinutes()).padStart(2, '0')}`);
        }
        setAnalyzingRoute(false);
      } else {
        setRouteData(null);
      }
    };
    const timer = setTimeout(analyze, 800);
    return () => clearTimeout(timer);
  }, [origin, destination, time]);

  const toggleDay = (day: number) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rawPrice = price.replace(/\D/g, "");
    if (!origin || !destination || (!isRecurring && !date) || (isRecurring && selectedDays.length === 0) || !rawPrice || !licensePlate) {
      setError("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    if (parseInt(rawPrice) <= 0) {
      setError("Giá không hợp lệ.");
      return;
    }
    const tripsToCreate: any[] = [];
    if (isRecurring) {
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + i);
        if (selectedDays.includes(nextDay.getDay())) {
          const [h, m] = time.split(':');
          nextDay.setHours(parseInt(h), parseInt(m), 0, 0);
          const [ah, am] = arrivalTime.split(':');
          const nextArrDay = new Date(nextDay);
          nextArrDay.setHours(parseInt(ah), parseInt(am), 0, 0);
          if (nextArrDay < nextDay) nextArrDay.setDate(nextArrDay.getDate() + 1);
          tripsToCreate.push({ departureTime: nextDay.toISOString(), arrivalTime: nextArrDay.toISOString() });
        }
      }
    } else {
      const [d, m, y] = date.split('-').map(Number);
      const departure = new Date(y, m - 1, d);
      const [h, min] = time.split(':').map(Number);
      departure.setHours(h, min, 0, 0);
      const arrival = new Date(y, m - 1, d);
      const [ah, amin] = arrivalTime.split(':').map(Number);
      arrival.setHours(ah, amin, 0, 0);
      if (arrival < departure) arrival.setDate(arrival.getDate() + 1);
      tripsToCreate.push({ departureTime: departure.toISOString(), arrivalTime: arrival.toISOString() });
    }
    setLoading(true);
    const tripBase = {
      origin: { name: origin, description: originDetail, mapsUrl: originUri },
      destination: { name: destination, description: destDetail, mapsUrl: destUri },
      price: parseInt(rawPrice),
      seats: seats,
      availableSeats: seats,
      vehicleInfo: `${vehicle} (${licensePlate})`,
      isRecurring: isRecurring,
      recurringDays: selectedDays
    };
    try {
      await onPost(tripsToCreate.map(t => ({ ...tripBase, departureTime: t.departureTime, arrivalTime: t.arrivalTime })));
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra khi lưu.");
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicleConfig = getVehicleConfig(vehicle);
  const SIcon = selectedVehicleConfig.icon;

  const mapUrl = origin && destination 
    ? `https://maps.google.com/maps?q=${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}&output=embed`
    : origin 
      ? `https://maps.google.com/maps?q=${encodeURIComponent(origin)}&output=embed`
      : `https://maps.google.com/maps?q=Hanoi,Vietnam&output=embed`;

  const getSeatDotColor = (s: number) => {
    if (s <= 2) return 'bg-emerald-500';
    if (s <= 5) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <form onSubmit={handleSubmit} className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
        {error && (
          <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2 font-outfit tracking-tight">
              <Navigation size={18} className="text-emerald-500" /> 1. Lộ trình chi tiết
            </h3>
            
            <div className="space-y-4 relative">
              <div className="absolute left-[18px] top-10 bottom-10 w-0.5 bg-slate-100 border-l border-dashed border-slate-200"></div>
              
              <div className="relative" ref={originRef}>
                <div className="flex gap-4">
                  <div className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${originUri ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <Navigation size={16} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1 block">Điểm đón</label>
                    <input type="text" value={origin} onChange={(e) => { setOrigin(e.target.value); setOriginUri(''); setError(null); }} placeholder="Tìm địa chỉ đón..." required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400" />
                    <input type="text" value={originDetail} onChange={(e) => setOriginDetail(e.target.value)} placeholder="Số nhà, ngõ ngách..." className="w-full px-4 py-2 bg-white border border-slate-100 rounded-lg outline-none text-xs italic text-slate-600 font-medium" />
                  </div>
                </div>
                {originSuggestions.length > 0 && (
                  <div className="absolute top-full left-12 right-0 z-50 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden mt-1">
                    {originSuggestions.map((s, idx) => (
                      <button key={idx} type="button" onClick={() => { setOrigin(s.name); setOriginUri(s.uri); setOriginSuggestions([]); }} className="w-full px-4 py-3 text-left hover:bg-emerald-50 text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0">{s.name}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={destRef}>
                <div className="flex gap-4">
                  <div className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${destUri ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1 block">Điểm trả</label>
                    <input type="text" value={destination} onChange={(e) => { setDestination(e.target.value); setDestUri(''); setError(null); }} placeholder="Tìm địa chỉ trả..." required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm text-slate-900 placeholder:text-slate-400" />
                    <input type="text" value={destDetail} onChange={(e) => setDestDetail(e.target.value)} placeholder="Ghi chú điểm trả..." className="w-full px-4 py-2 bg-white border border-slate-100 rounded-lg outline-none text-xs italic text-slate-600 font-medium" />
                  </div>
                </div>
                {destSuggestions.length > 0 && (
                  <div className="absolute top-full left-12 right-0 z-50 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden mt-1">
                    {destSuggestions.map((s, idx) => (
                      <button key={idx} type="button" onClick={() => { setDestination(s.name); setDestUri(s.uri); setDestSuggestions([]); }} className="w-full px-4 py-3 text-left hover:bg-emerald-50 text-xs font-bold text-slate-700 border-b border-slate-50 last:border-0">{s.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-[28px] border border-slate-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                       <MapIcon size={16} />
                    </div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-bold text-slate-400">Quãng đường</p>
                       <p className="text-xs font-black text-slate-800 truncate">{routeData?.distance || (analyzingRoute ? '...' : '---')}</p>
                    </div>
                 </div>
                 <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                       <Timer size={16} />
                    </div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-bold text-slate-400">Thời gian lái</p>
                       <p className="text-xs font-black text-slate-800 truncate">{routeData?.duration_text || (analyzingRoute ? '...' : '---')}</p>
                    </div>
                 </div>
              </div>

              <div className="w-full h-80 rounded-[24px] overflow-hidden border border-slate-200 shadow-inner relative">
                 <iframe width="100%" height="100%" frameBorder="0" src={mapUrl} className="grayscale-[0.1] contrast-[1.05]" />
                 <div className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-black text-slate-600 border border-white/50 shadow-md">Lộ trình Google Maps</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2 font-outfit tracking-tight">
              <Clock size={18} className="text-indigo-500" /> 2. Thời gian & chi phí
            </h3>
            
            <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shadow-sm"><Repeat size={16} /></div>
                  <span className="text-xs font-bold text-slate-700 font-outfit">Chuyến định kỳ hàng tuần</span>
                </div>
                <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={`w-12 h-6 rounded-full transition-all relative ${isRecurring ? 'bg-emerald-600 shadow-lg shadow-emerald-100' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRecurring ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-4">
                {!isRecurring ? (
                  <div className="relative" ref={datePickerRef}>
                    <label className="text-[11px] font-bold text-slate-500 ml-1 block mb-1">Ngày khởi hành</label>
                    <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 shadow-sm hover:border-emerald-300 transition-all">
                      <span>{date}</span><Calendar size={18} className="text-emerald-500" />
                    </button>
                    {showDatePicker && <div className="absolute top-full left-0 z-[60] mt-2"><CustomDatePicker selectedDate={date} onSelect={setDate} onClose={() => setShowDatePicker(false)} /></div>}
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 ml-1 block mb-2">Lặp lại vào các thứ</label>
                    <div className="grid grid-cols-7 gap-1.5">
                      {DAYS_OF_WEEK.map(day => (
                        <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`py-3 rounded-xl text-xs font-bold border transition-all ${selectedDays.includes(day.value) ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>{day.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 ml-1 block">Khởi hành</label>
                    <div className="relative" ref={timePickerRef}>
                      <button type="button" onClick={() => setShowTimePicker(!showTimePicker)} className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 shadow-sm hover:border-emerald-300 transition-all"><span>{time}</span><Clock size={18} className="text-emerald-500" /></button>
                      {showTimePicker && <div className="absolute top-full left-0 z-[60] mt-2"><CustomTimePicker selectedTime={time} onSelect={setTime} onClose={() => setShowTimePicker(false)} /></div>}
                    </div>
                  </div>
                  <div className="pt-6"><ArrowRight size={16} className="text-slate-300" /></div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 ml-1 block">Dự kiến đến</label>
                    <div className="relative" ref={arrivalTimePickerRef}>
                      <button type="button" onClick={() => setShowArrivalTimePicker(!showArrivalTimePicker)} className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-2xl text-sm font-bold text-slate-900 shadow-sm transition-all ${analyzingRoute ? 'animate-pulse border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}><span>{arrivalTime}</span><Clock size={18} className="text-indigo-500" /></button>
                      {showArrivalTimePicker && <div className="absolute top-full right-0 z-[60] mt-2"><CustomTimePicker selectedTime={arrivalTime} onSelect={setArrivalTime} onClose={() => setShowArrivalTimePicker(false)} /></div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5" ref={vehiclePickerRef}>
                <label className="text-[11px] font-bold text-slate-500 ml-1 block">Loại xe</label>
                <div className="relative">
                  <button type="button" onClick={() => setShowVehiclePicker(!showVehiclePicker)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm text-slate-900 transition-all hover:bg-white">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-black ${selectedVehicleConfig.style}`}>
                      <SIcon size={10} /> {vehicle}
                    </span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>
                  {showVehiclePicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-100 rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-200">
                      {vehicleOptions.map(opt => {
                        const config = getVehicleConfig(opt.label);
                        const VIcon = config.icon;
                        return (
                          <button key={opt.value} type="button" onClick={() => { setVehicle(opt.value); setShowVehiclePicker(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left ${vehicle === opt.value ? 'bg-indigo-50/50' : ''}`}>
                            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${config.style}`}>
                              <VIcon size={10} /> {opt.label}
                            </span>
                            {vehicle === opt.value && <Check size={12} className="text-indigo-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5" ref={seatsPickerRef}>
                <label className="text-[11px] font-bold text-slate-500 ml-1 block">Ghế trống</label>
                <div className="relative">
                  <button type="button" onClick={() => setShowSeatsPicker(!showSeatsPicker)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-900 outline-none hover:bg-white transition-all">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${getSeatDotColor(seats)}`}></div>
                      <span>{seats} ghế</span>
                    </div>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>
                  {showSeatsPicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-slate-100 rounded-2xl shadow-2xl p-1.5 grid grid-cols-4 gap-1 animate-in fade-in zoom-in-95 duration-200">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <button key={s} type="button" onClick={() => { setSeats(s); setShowSeatsPicker(false); }} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${seats === s ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'hover:bg-slate-50 text-slate-600'}`}>
                           <div className={`w-1.5 h-1.5 rounded-full mb-1 ${getSeatDotColor(s)}`}></div>
                           <span className="text-[10px] font-black">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 ml-1 block">Biển kiểm soát</label>
              <div className="relative group">
                <Car size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
                <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} placeholder="Ví dụ: 29A-XXXXX" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-50" />
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 ml-1 block">Giá mỗi chỗ ngồi</label>
                <div className="flex flex-wrap gap-1.5">
                  {priceSuggestions.map((suggestion) => (
                    <button key={suggestion.value} type="button" onClick={() => setPrice(suggestion.value.toString())} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors whitespace-nowrap">{suggestion.label}</button>
                  ))}
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <DollarSign size={16} />
                </div>
                <input type="text" value={formatNumber(price)} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="0" required className="w-full pl-14 pr-12 py-3 bg-emerald-50/30 border-2 border-emerald-100 rounded-[20px] text-2xl font-black text-emerald-600 focus:bg-white focus:border-emerald-500 outline-none text-right shadow-sm transition-all" />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-lg">đ</span>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#4c4ae2] text-white rounded-[20px] font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 hover:bg-[#3b39d1] transition-all active:scale-[0.98] font-outfit mt-4">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} strokeWidth={2.5} /> Xác nhận đăng chuyến</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PostTrip;
