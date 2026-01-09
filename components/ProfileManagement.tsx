
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  User, Phone, ShieldCheck, Save, Loader2, Clock, 
  CheckCircle2, Navigation, Ticket, ArrowRight, AlertCircle, 
  History, Calendar, LucideIcon, Bookmark, Camera, Car, Shield, Settings, X, Sparkles, MapPin, Copy, LogOut,
  Timer, Play, Ban, Map as MapIcon
} from 'lucide-react';
import { Profile, UserRole, Trip, Booking } from '../types';
import { supabase } from '../lib/supabase';
import CopyableCode from './CopyableCode';
import { getTripStatusDisplay } from './SearchTrips';
import { statusOptions as bookingStatusOptions } from './OrderManagement';

interface ProfileManagementProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onUpdate: () => void;
  stats: {
    tripsCount: number;
    bookingsCount: number;
  };
  allTrips: Trip[];
  userBookings: Booking[];
  onManageVehicles: () => void;
}

interface ActivityItem {
  id: string;
  type: 'trip' | 'booking';
  title: string;
  description: string;
  timestamp: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  raw: Trip | Booking;
}

const ProfileManagement: React.FC<ProfileManagementProps> = ({ isOpen, onClose, profile, onUpdate, stats, allTrips, userBookings, onManageVehicles }) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [activeFilter, setActiveFilter] = useState<'all' | 'trip' | 'booking'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
    }
  }, [profile]);

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

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];
    const myTrips = allTrips.filter(t => t.driver_id === profile?.id);
    myTrips.forEach(t => {
      items.push({
        id: `trip-${t.id}`,
        type: 'trip',
        title: 'Đăng chuyến',
        description: `${t.origin_name} → ${t.dest_name}`,
        timestamp: t.created_at || t.departure_time,
        icon: Navigation,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        raw: t
      });
    });

    userBookings.forEach(b => {
      items.push({
        id: `booking-${b.id}`,
        type: 'booking',
        title: 'Đặt chỗ',
        description: `Mã đơn: S${b.id.substring(0, 5).toUpperCase()}`,
        timestamp: b.created_at,
        icon: Ticket,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        raw: b
      });
    });

    let sorted = items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (activeFilter !== 'all') {
      sorted = sorted.filter(item => item.type === activeFilter);
    }
    return sorted.slice(0, 10);
  }, [allTrips, userBookings, profile, activeFilter]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone })
        .eq('id', profile.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Đã lưu thay đổi!' });
      onUpdate();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Đã có lỗi xảy ra.' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeConfig = (role?: UserRole) => {
    switch(role) {
      case 'admin': return { label: 'Quản trị viên', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: Shield };
      case 'driver': return { label: 'Tài xế', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: Car };
      case 'manager': return { label: 'Điều phối', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', icon: Settings };
      default: return { label: 'Thành viên', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', icon: User };
    }
  };

  if (!isOpen) return null;

  const userCode = `C${profile?.id.substring(0, 5).toUpperCase() || '00000'}`;
  const roleInfo = getRoleBadgeConfig(profile?.role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="bg-[#F8FAFC] w-full max-w-4xl h-[85vh] md:h-auto md:max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col relative border border-white"
      >
        {/* Compact Header with Soft Gradient (Matches Main App Header) */}
        <div className="h-32 bg-gradient-to-r from-emerald-50/80 via-white/90 to-indigo-50/80 relative shrink-0 border-b border-emerald-50">
           <button 
            onClick={onClose} 
            className="absolute top-4 right-4 w-9 h-9 bg-white/60 hover:bg-white backdrop-blur-md text-slate-500 rounded-full flex items-center justify-center transition-all z-20 shadow-sm border border-white"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
          
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>

        {/* Body Content - Adjusted for Avatar Clipping (-mt-28 + pt-16 = -12px net visual shift, but expands box) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar -mt-28 pt-16 px-6 pb-8 relative z-10">
          
          {/* Main Profile Card */}
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-5 md:p-6 flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8 mb-6 relative">
             
             {/* Avatar Floating */}
             <div className="w-24 h-24 md:w-28 md:h-28 rounded-[28px] bg-white p-1 shadow-lg shrink-0 -mt-16 md:-mt-0 md:absolute md:-top-12 md:left-6">
                <div className="w-full h-full rounded-[24px] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-4xl font-bold text-slate-300 border border-slate-100 overflow-hidden relative group cursor-pointer">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-indigo-500">{profile?.full_name?.charAt(0) || 'U'}</span>
                  )}
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Camera size={20} className="text-white drop-shadow-md" />
                  </div>
                </div>
             </div>

             {/* Spacing for Desktop Avatar */}
             <div className="hidden md:block w-28 shrink-0"></div>

             {/* Info Section */}
             <div className="flex-1 text-center md:text-left min-w-0 w-full">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3 truncate">{profile?.full_name}</h2>
                
                {/* Badges Row - Copyable */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                   {/* Role Badge */}
                   <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}>
                      <RoleIcon size={12} /> {roleInfo.label}
                   </div>

                   {/* User ID Badge - Fixed Width */}
                   <div className="group relative">
                      <div className="absolute inset-0 bg-indigo-100 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative px-3 py-1.5 w-24 justify-center rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1.5 cursor-pointer hover:bg-indigo-100 transition-colors">
                         <CopyableCode code={userCode} className="font-bold" />
                      </div>
                   </div>

                   {/* Phone Badge */}
                   <div className="group relative">
                      <div className="absolute inset-0 bg-emerald-100 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition-colors">
                         <Phone size={12} />
                         <CopyableCode code={profile?.phone || ''} label={profile?.phone || 'Chưa có SĐT'} className="font-bold" />
                      </div>
                   </div>
                </div>
             </div>

             {/* Compact Stats (Gray Style) */}
             <div className="flex gap-3 shrink-0">
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-center min-w-[70px]">
                   <p className="text-[10px] text-slate-500 font-bold uppercase">Chuyến đi</p>
                   <p className="text-lg font-black text-slate-700 leading-none mt-0.5">{stats.tripsCount}</p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 text-center min-w-[70px]">
                   <p className="text-[10px] text-slate-500 font-bold uppercase">Chuyến đặt</p>
                   <p className="text-lg font-black text-slate-700 leading-none mt-0.5">{stats.bookingsCount}</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Col: Settings */}
            <div className="lg:col-span-5 space-y-4">
               <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                     <Settings size={16} className="text-indigo-500" />
                     <h3 className="text-sm font-bold text-slate-800">Thông tin cá nhân</h3>
                  </div>
                  
                  <form onSubmit={handleUpdate} className="space-y-3">
                     {message && (
                        <div className={`p-3 rounded-xl text-[10px] font-bold border flex items-center gap-2 animate-in fade-in zoom-in-95 ${
                           message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                           {message.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                           {message.text}
                        </div>
                     )}

                     <div>
                        <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">Tên hiển thị</label>
                        <input 
                           type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 transition-all"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">Số điện thoại (Công khai)</label>
                        <input 
                           type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 transition-all"
                        />
                     </div>

                     <button 
                        type="submit" disabled={loading}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 mt-2"
                     >
                        {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Lưu thay đổi
                     </button>
                  </form>
               </div>

               {profile?.role === 'driver' && (
                  <button onClick={onManageVehicles} className="w-full p-4 bg-slate-800 text-white rounded-[24px] shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg"><Car size={16} /></div>
                        <div className="text-left">
                           <p className="text-xs font-bold">Quản lý đội xe</p>
                           <p className="text-[9px] text-slate-400">Thêm, sửa, xóa xe</p>
                        </div>
                     </div>
                     <ArrowRight size={14} className="text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </button>
               )}
               
               <button 
                  onClick={() => supabase.auth.signOut()} 
                  className="w-full p-4 bg-white border border-rose-100 text-rose-500 rounded-[24px] hover:bg-rose-50 transition-all flex items-center justify-center gap-2 text-xs font-bold"
               >
                  <LogOut size={14} /> Đăng xuất tài khoản
               </button>
            </div>

            {/* Right Col: Activity */}
            <div className="lg:col-span-7">
               <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <History size={16} className="text-emerald-500" />
                        <h3 className="text-sm font-bold text-slate-800">Hoạt động gần đây</h3>
                     </div>
                     <div className="flex gap-1">
                        {['all', 'trip', 'booking'].map((t) => (
                           <button 
                              key={t}
                              onClick={() => setActiveFilter(t as any)}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${activeFilter === t ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                           >
                              {t === 'all' ? 'Tất cả' : t === 'trip' ? 'Chuyến' : 'Đơn'}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 relative min-h-[300px]">
                     <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-slate-100"></div>
                     {activities.length > 0 ? activities.map((item) => {
                        // Use shared helpers for status display
                        const isTrip = item.type === 'trip';
                        let statusConfig;
                        
                        if (isTrip) {
                           statusConfig = getTripStatusDisplay(item.raw as Trip);
                        } else {
                           const statusVal = (item.raw as Booking).status;
                           statusConfig = bookingStatusOptions.find(s => s.value === statusVal) || { 
                              label: statusVal, 
                              style: 'bg-slate-100 text-slate-500 border-slate-200', 
                              icon: AlertCircle 
                           };
                        }
                        
                        const StatusIcon = statusConfig.icon;

                        return (
                           <div key={item.id} className="relative pl-12 py-2 group">
                              <div className={`absolute left-[11px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${item.bgColor} flex items-center justify-center`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${item.color.replace('text-', 'bg-')}`}></div>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-sm transition-all">
                                 <div>
                                    <p className="text-[10px] font-bold text-slate-800">{item.title}</p>
                                    <p className="text-[9px] text-slate-500 truncate max-w-[150px] sm:max-w-[200px]">{item.description}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 mb-1">{new Date(item.timestamp).toLocaleDateString('vi-VN')}</p>
                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-bold uppercase ${statusConfig.style}`}>
                                       <StatusIcon size={10} />
                                       {statusConfig.label}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        );
                     }) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                           <History size={32} className="mb-2" />
                           <p className="text-[10px] font-bold">Chưa có dữ liệu</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileManagement;
