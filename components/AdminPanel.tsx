
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Shield, Search, Phone, Loader2, ArrowUpDown, Trash2, ChevronDown, Check, Car, Ticket, 
  Trophy, Star, Medal, Zap, CalendarDays, User, Settings, ShieldAlert, Edit3, X, Save, Clock
} from 'lucide-react';
import { Profile, UserRole } from '../types.ts';
import { supabase } from '../lib/supabase.ts';
import CopyableCode from './CopyableCode.tsx';
import { UnifiedDropdown } from './SearchTrips.tsx';

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
};

type SortConfig = { key: string; direction: 'asc' | 'desc' | null };

interface UserWithStats extends Profile {
  trips_count: number;
  bookings_count: number;
  last_activity_at?: string;
  created_at?: string;
}

const getStatBadge = (count: number, type: 'trip' | 'booking') => {
  const Icon = type === 'trip' ? Car : Ticket;
  if (count >= 10) return { bg: 'bg-rose-600 text-white border-rose-700 shadow-sm ring-1 ring-rose-200', icon: <Trophy size={10} className="animate-pulse" />, label: 'Elite' };
  if (count >= 8) return { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Medal size={10} />, label: 'Expert' };
  if (count >= 5) return { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <Star size={10} />, label: 'Pro' };
  if (count >= 3) return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <Zap size={10} />, label: 'Active' };
  if (count >= 1) return { bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Icon size={10} />, label: 'User' };
  return { bg: 'bg-slate-50 text-slate-400 border-slate-100', icon: <Icon size={10} className="opacity-40" />, label: 'New' };
};

const RoleSelector = ({ value, onChange, disabled }: { value: UserRole, onChange: (role: UserRole) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const roles: { label: string, value: UserRole, icon: any, color: string }[] = [
    { label: 'Quản trị', value: 'admin', icon: Shield, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { label: 'Điều phối', value: 'manager', icon: Settings, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'Tài xế', value: 'driver', icon: Car, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Thành viên', value: 'user', icon: User, color: 'text-slate-600 bg-slate-50 border-slate-100' },
  ];
  
  const currentRole = roles.find(r => r.value === value) || roles[3];
  const filteredRoles = roles.filter(r => removeAccents(r.label).includes(removeAccents(roleSearch)));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setRoleSearch('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        type="button" 
        disabled={disabled} 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-xl transition-all duration-300 relative z-10 ${currentRole.color} ${isOpen ? 'ring-2 ring-indigo-100 border-indigo-400 shadow-sm' : 'hover:brightness-95'}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <currentRole.icon size={12} className={currentRole.color.split(' ')[0]} />
          <span className="text-[11px] font-bold truncate">{currentRole.label}</span>
        </div>
        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-48 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-slate-100 z-[999] p-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="relative mb-2 px-1 pt-1">
            <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" autoFocus placeholder="Tìm quyền..." value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full pl-8 pr-2 py-2 bg-slate-50 border-none rounded-lg text-[10px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400"
            />
          </div>
          <div className="space-y-0.5 p-0.5 max-h-48 overflow-y-auto custom-scrollbar">
            {filteredRoles.map((role) => (
              <button key={role.value} type="button" 
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(role.value); setIsOpen(false); setRoleSearch(''); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${value === role.value ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
                <div className="flex items-center gap-3">
                  <role.icon size={12} className={value === role.value ? 'text-white' : role.color.split(' ')[0]} />
                  <span className="text-[11px] font-bold">{role.label}</span>
                </div>
                {value === role.value && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ full_name: '', phone: '' });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NAME_ASC');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'full_name', direction: 'asc' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
      if (profileError) throw profileError;

      const { data: trips } = await supabase.from('trips').select('driver_id, created_at').order('created_at', { ascending: false });
      const { data: bookings } = await supabase.from('bookings').select('passenger_id, created_at').order('created_at', { ascending: false });

      const userStats = (profiles || []).map(p => {
        const userTrips = trips?.filter(t => t.driver_id === p.id) || [];
        const userBookings = bookings?.filter(b => b.passenger_id === p.id) || [];
        
        const lastTripAt = userTrips[0]?.created_at;
        const lastBookingAt = userBookings[0]?.created_at;
        
        let lastActivity = undefined;
        if (lastTripAt && lastBookingAt) {
          lastActivity = new Date(lastTripAt) > new Date(lastBookingAt) ? lastTripAt : lastBookingAt;
        } else {
          lastActivity = lastTripAt || lastBookingAt;
        }

        return {
          ...p,
          trips_count: userTrips.length,
          bookings_count: userBookings.length,
          last_activity_at: lastActivity
        };
      });
      setUsers(userStats);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSort = (key: string) => {
    let direction: SortConfig['direction'] = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
    let filtered = users.filter(u => {
      const nameMatch = removeAccents(u.full_name || '').includes(removeAccents(searchTerm));
      const phoneMatch = u.phone?.includes(searchTerm);
      const matchesSearch = nameMatch || phoneMatch;
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    if (sortConfig.key && sortConfig.direction) {
      filtered.sort((a: any, b: any) => {
        let valA = a[sortConfig.key] || 0;
        let valB = b[sortConfig.key] || 0;
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [users, searchTerm, roleFilter, sortConfig]);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) { alert(err.message); } finally { setUpdatingId(null); }
  };

  const handleStartEdit = (user: UserWithStats) => {
    setEditingId(user.id);
    setEditData({ full_name: user.full_name, phone: user.phone || '' });
  };

  const handleSaveInfo = async (userId: string) => {
    setUpdatingId(userId);
    try {
      const { error } = await supabase.from('profiles').update({ 
        full_name: editData.full_name, 
        phone: editData.phone 
      }).eq('id', userId);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...editData } : u));
      setEditingId(null);
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setUpdatingId(null); 
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Xoá người dùng "${userName}"?`)) return;
    setDeletingId(userId);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) { alert(err.message); } finally { setDeletingId(null); }
  };

  const SortHeader = ({ label, sortKey, width, textAlign = 'text-left' }: { label: string, sortKey: string, width?: string, textAlign?: string }) => (
    <th style={{ width }} className={`px-4 py-4 text-[11px] font-bold text-slate-400 cursor-pointer hover:bg-slate-100/50 transition-colors ${textAlign}`} onClick={() => handleSort(sortKey)}>
      <div className={`flex items-center gap-1.5 ${textAlign === 'text-center' ? 'justify-center' : textAlign === 'text-right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={10} className={`${sortConfig.key === sortKey ? 'text-indigo-600' : 'opacity-20'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full min-w-0 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text" placeholder="Tìm thành viên, số điện thoại..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-400 focus:bg-white outline-none transition-all font-bold text-slate-800 text-sm placeholder:text-slate-400" 
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <UnifiedDropdown label="Chức vụ" icon={Shield} value={roleFilter} onChange={setRoleFilter} width="w-48" showCheckbox={false}
              options={[{label:'Tất cả chức vụ', value:'ALL'}, {label:'Quản trị viên', value:'admin'}, {label:'Tài xế', value:'driver'}, {label:'Điều phối', value:'manager'}, {label:'Thành viên', value:'user'}]} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-visible min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left table-fixed min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <SortHeader label="Thành viên & Mã" sortKey="full_name" width="20%" />
                <SortHeader label="Ngày tham gia" sortKey="created_at" width="12%" />
                <SortHeader label="Liên hệ" sortKey="phone" width="16%" />
                <SortHeader label="Chuyến đi" sortKey="trips_count" width="10%" textAlign="text-center" />
                <SortHeader label="Chuyến đặt" sortKey="bookings_count" width="10%" textAlign="text-center" />
                <SortHeader label="Gần nhất" sortKey="last_activity_at" width="12%" />
                <SortHeader label="Quyền hạn" sortKey="role" width="15%" textAlign="text-center" />
                <th className="px-4 py-4 text-[11px] font-bold text-slate-400 text-right pr-8">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map(user => {
                const tripBadge = getStatBadge(user.trips_count, 'trip');
                const bookingBadge = getStatBadge(user.bookings_count, 'booking');
                const userCode = `C${user.id.substring(0,5).toUpperCase()}`;
                const isEditing = editingId === user.id;

                return (
                  <tr key={user.id} className={`hover:bg-slate-50/30 transition-colors group/row ${isEditing ? 'bg-indigo-50/20' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-slate-500 font-bold text-[11px] shrink-0 border border-slate-100 shadow-sm uppercase">{user.full_name?.charAt(0) || '?'}</div>
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={editData.full_name} 
                              onChange={e => setEditData({...editData, full_name: e.target.value})}
                              className="w-full px-2 py-1 text-[12px] font-bold border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            />
                          ) : (
                            <p className="text-[12px] font-bold text-slate-800 truncate mb-1">{user.full_name}</p>
                          )}
                          <div className="inline-flex items-center bg-[#7B68EE10] text-[#7B68EE] px-2 py-0.5 rounded-md border border-[#7B68EE30] shadow-sm">
                            <CopyableCode code={userCode} className="text-[9px] font-black" label={userCode} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <CalendarDays size={12} className="text-slate-300" />
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '--/--/----'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="relative w-full">
                            <Phone size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="tel" 
                              value={editData.phone} 
                              onChange={e => setEditData({...editData, phone: e.target.value})}
                              className="w-full pl-6 pr-2 py-1 text-[12px] font-bold border border-indigo-200 rounded outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                            />
                          </div>
                        ) : (
                          <>
                            {user.phone && (
                              <a href={`tel:${user.phone}`} className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shrink-0">
                                 <Phone size={10} />
                              </a>
                            )}
                            <CopyableCode code={user.phone || ''} className="text-[11px] font-bold text-indigo-600" label={user.phone || 'N/A'} />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black ${tripBadge.bg}`}>
                        {tripBadge.icon} {user.trips_count}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black ${bookingBadge.bg}`}>
                        {bookingBadge.icon} {user.bookings_count}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                       <div className="flex flex-col gap-0.5">
                          {user.last_activity_at ? (
                             <>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                   <Clock size={10} className="text-emerald-500" />
                                   {new Date(user.last_activity_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                                </div>
                                <div className="text-[9px] font-bold text-slate-300 ml-3.5">
                                   {new Date(user.last_activity_at).toLocaleDateString('vi-VN')}
                                </div>
                             </>
                          ) : (
                             <span className="text-[9px] font-bold text-slate-300 italic">Chưa hoạt động</span>
                          )}
                       </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="w-36 relative">
                          {updatingId === user.id && !isEditing ? <div className="flex items-center justify-center py-2 bg-slate-50 rounded-xl border border-slate-100"><Loader2 className="animate-spin text-indigo-500" size={14} /></div> : <RoleSelector value={user.role} onChange={(role) => handleUpdateRole(user.id, role)} />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveInfo(user.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 shadow-sm">
                              {updatingId === user.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all border border-slate-200 shadow-sm">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(user)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 opacity-0 group-hover/row:opacity-100 shadow-sm">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id, user.full_name)} disabled={deletingId === user.id} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm">
                              {deletingId === user.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="h-40"></div>
        </div>
      </div>
    </div>
  );
};
export default AdminPanel;
