
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import SearchTrips from './components/SearchTrips.tsx';
import PostTrip from './components/PostTrip.tsx';
import BookingsList from './components/BookingsList.tsx';
import ProfileManagement from './components/ProfileManagement.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import BookingModal from './components/BookingModal.tsx';
import AuthModal from './components/AuthModal.tsx';
import TripManagement from './components/TripManagement.tsx';
import OrderManagement from './components/OrderManagement.tsx';
import TripDetailModal from './components/TripDetailModal.tsx'; 
import VehicleManagementModal from './components/VehicleManagementModal.tsx';
import { Trip, Booking, TripStatus, Notification, Profile } from './types.ts';
import { supabase } from './lib/supabase.ts';
import { getTripStatusDisplay } from './components/SearchTrips.tsx';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]); 
  const [staffBookings, setStaffBookings] = useState<Booking[]>([]); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userStats, setUserStats] = useState({ tripsCount: 0, bookingsCount: 0 });
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false); 
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedTripBookings, setSelectedTripBookings] = useState<Booking[]>([]); 

  const refreshTimeoutRef = useRef<number | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
    setProfileLoading(false);
  }, []);

  const fetchTrips = useCallback(async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*, profiles(full_name, phone)')
      .order('departure_time', { ascending: true });
    
    if (error) return;

    if (data) {
      const formatted = data.map(t => ({
        ...t,
        driver_name: t.profiles?.full_name || 'Người dùng ẩn danh',
        driver_phone: t.profiles?.phone || '',
        trip_code: `T${t.id.substring(0, 5).toUpperCase()}`
      }));
      setTrips(formatted);
    }
  }, []);

  const fetchUserBookings = useCallback(async (userId: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*, trips(*)')
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) return;
    setBookings(data || []);
  }, []);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
  };

  const fetchStaffBookings = useCallback(async (userProfile: Profile) => {
    if (!userProfile) return;
    let query = supabase.from('bookings').select('*, profiles:passenger_id(full_name, phone), trips(*)').order('created_at', { ascending: false });

    if (userProfile.role === 'driver') {
      const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', userProfile.id);
      const myTripIds = myTrips?.map(t => t.id) || [];
      if (myTripIds.length > 0) query = query.in('trip_id', myTripIds);
      else { setStaffBookings([]); return; }
    }
    const { data, error } = await query;
    if (error) return;
    setStaffBookings(data || []);
  }, []);

  const fetchUserStats = useCallback(async (userId: string) => {
    if (!userId) return;
    const { count: tripsCount } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('driver_id', userId);
    const { count: bookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('passenger_id', userId);
    setUserStats({ tripsCount: tripsCount || 0, bookingsCount: bookingsCount || 0 });
  }, []);

  const refreshAllData = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      fetchTrips();
      if (user?.id) {
        fetchUserBookings(user.id);
        fetchUserStats(user.id);
        if (profile) fetchStaffBookings(profile);
      }
    }, 300) as unknown as number;
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats, user?.id, profile]);

  const fetchSelectedTripDetails = useCallback(async (tripId: string | null) => {
    if (!tripId) {
      setSelectedTrip(null);
      setSelectedTripBookings([]);
      return;
    }
    const { data: latestTrip } = await supabase.from('trips').select('*, profiles(full_name, phone)').eq('id', tripId).single();
    if (!latestTrip) return;

    const formattedTrip = { ...latestTrip, driver_name: latestTrip.profiles?.full_name || 'Người dùng ẩn danh', driver_phone: latestTrip.profiles?.phone || '', trip_code: `T${latestTrip.id.substring(0, 5).toUpperCase()}` };
    const { data: bookingsForTrip } = await supabase.from('bookings').select('*, profiles:passenger_id(full_name, phone), trips(*)').eq('trip_id', tripId).order('created_at', { ascending: false });

    setSelectedTrip(formattedTrip);
    setSelectedTripBookings(bookingsForTrip || []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setProfileLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setProfileLoading(true);
        fetchProfile(currentUser.id);
      } else { 
        setProfile(null); 
        setProfileLoading(false);
        setBookings([]); 
        setStaffBookings([]); 
        setUserStats({ tripsCount: 0, bookingsCount: 0 }); 
      }
    });

    fetchTrips();
    return () => { authListener.subscription.unsubscribe(); };
  }, [fetchTrips, fetchProfile]);

  useEffect(() => { if (user?.id) { fetchUserBookings(user.id); fetchUserStats(user.id); } }, [user?.id, fetchUserBookings, fetchUserStats]);
  useEffect(() => { if (profile) fetchStaffBookings(profile); }, [profile, fetchStaffBookings]);

  useEffect(() => {
    if ((isTripDetailModalOpen || isBookingModalOpen) && selectedTrip?.id) fetchSelectedTripDetails(selectedTrip.id);
    else if (!isTripDetailModalOpen && !isBookingModalOpen) { setSelectedTrip(null); setSelectedTripBookings([]); }
  }, [isTripDetailModalOpen, isBookingModalOpen, selectedTrip?.id, fetchSelectedTripDetails]);

  useEffect(() => {
    const channel = supabase.channel('app-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, async (payload) => { refreshAllData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => { refreshAllData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, async (payload) => { refreshAllData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshAllData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      let hasGlobalChanges = false;

      const { data: latestTrips } = await supabase.from('trips').select('*');
      for (const trip of latestTrips || []) {
        if (trip.status === TripStatus.CANCELLED || trip.status === TripStatus.COMPLETED) continue;
        const departure = new Date(trip.departure_time);
        const arrival = trip.arrival_time ? new Date(trip.arrival_time) : new Date(departure.getTime() + 3 * 60 * 60 * 1000);
        let targetStatus = trip.status;
        const diffMins = Math.floor((departure.getTime() - now.getTime()) / 60000);
        
        if (now > arrival) targetStatus = TripStatus.COMPLETED;
        else if (now >= departure && now <= arrival) targetStatus = TripStatus.ON_TRIP;
        else {
          if (diffMins <= 60 && diffMins > 0) targetStatus = TripStatus.URGENT;
          else targetStatus = TripStatus.PREPARING;
          if (trip.available_seats <= 0) targetStatus = TripStatus.FULL;
        }
        
        if (targetStatus !== trip.status) {
          hasGlobalChanges = true;
          await supabase.from('trips').update({ status: targetStatus }).eq('id', trip.id);
        }

        const { data: tripBookings } = await supabase.from('bookings').select('*').eq('trip_id', trip.id);
        for (const booking of tripBookings || []) {
          if (now >= departure && now <= arrival && (booking.status === 'CONFIRMED' || booking.status === 'PICKED_UP')) {
            await supabase.from('bookings').update({ status: 'ON_BOARD' }).eq('id', booking.id);
            hasGlobalChanges = true;
          }
          if (now > arrival && booking.status === 'PENDING') {
            await supabase.from('bookings').update({ status: 'EXPIRED' }).eq('id', booking.id);
            hasGlobalChanges = true;
          }
        }
      }

      if (hasGlobalChanges) refreshAllData();
    }, 60000); 
    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Calculate pending orders for staff badge
  const pendingOrderCount = useMemo(() => {
    return staffBookings.filter(b => b.status === 'PENDING').length;
  }, [staffBookings]);

  const handlePostTrip = async (tripsToPost: any[]) => {
    if (!user) return;
    try {
      const formattedTrips = tripsToPost.map(t => ({
        driver_id: user.id, 
        origin_name: t.origin.name, 
        origin_desc: t.origin.description, 
        dest_name: t.destination.name,
        dest_desc: t.destination.description, 
        departure_time: t.departureTime, 
        arrival_time: t.arrivalTime,
        price: t.price, 
        seats: t.seats, 
        available_seats: t.availableSeats, 
        vehicle_info: t.vehicleInfo, 
        status: TripStatus.PREPARING,
        is_request: t.isRequest // QUAN TRỌNG: Lưu cờ is_request vào DB
      }));
      const { error } = await supabase.from('trips').insert(formattedTrips);
      if (error) throw error;
      refreshAllData();
      // Chuyển tab dựa trên loại bài đăng
      if (tripsToPost[0].isRequest) {
        setActiveTab('bookings'); // Chuyển về màn hình quản lý cá nhân để thấy post
      } else {
        setActiveTab('bookings'); // Chuyển về màn hình quản lý cá nhân
      }
    } catch (err: any) { alert('Lỗi: ' + err.message); }
  };

  const handleConfirmBooking = async (data: { phone: string; seats: number; note: string }) => {
    if (!selectedTrip || !user) return;
    const { data: latestTrip } = await supabase.from('trips').select('available_seats, status, departure_time').eq('id', selectedTrip.id).single();
    if (latestTrip && (latestTrip.status === TripStatus.CANCELLED || latestTrip.status === TripStatus.COMPLETED || new Date(latestTrip.departure_time) < new Date())) {
      alert('Xin lỗi, chuyến xe này không còn khả dụng.'); return;
    }
    
    // Nếu là request của khách, thì "booking" thực chất là tài xế nhận chuyến -> không cần check available_seats theo kiểu > 0
    if (!selectedTrip.is_request && latestTrip && latestTrip.available_seats < data.seats) {
      alert(`Không đủ chỗ. Còn ${latestTrip.available_seats} ghế.`); return;
    }

    const { error: bookingError } = await supabase.from('bookings').insert({
      trip_id: selectedTrip.id, passenger_id: user.id, passenger_phone: data.phone,
      seats_booked: data.seats, total_price: selectedTrip.price * data.seats, status: 'PENDING'
    });
    if (bookingError) alert('Lỗi: ' + bookingError.message);
    else {
      const newAvailable = (latestTrip?.available_seats || 0) - data.seats;
      await supabase.from('trips').update({ available_seats: newAvailable, status: newAvailable <= 0 ? TripStatus.FULL : latestTrip?.status }).eq('id', selectedTrip.id);
      setIsBookingModalOpen(false);
      refreshAllData();
      setActiveTab('bookings');
    }
  };

  const handleOpenBookingModal = (tripId: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    const trip = trips.find(t => t.id === tripId);
    if (trip) { 
      const statusLabel = getTripStatusDisplay(trip).label;
      if (['Hoàn thành', 'Đang chạy', 'Huỷ'].includes(statusLabel)) { alert('Chuyến này đã kết thúc hoặc bị hủy.'); return; }
      setSelectedTrip(trip); setIsBookingModalOpen(true); 
    }
  };

  const handleViewTripDetails = useCallback((trip: Trip) => { setSelectedTrip(trip); setIsTripDetailModalOpen(true); }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return profile && ['admin', 'manager', 'driver'].includes(profile.role) ? <Dashboard bookings={staffBookings} trips={trips} /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} userBookings={bookings} profile={profile} onViewTripDetails={handleViewTripDetails} />;
      case 'search': return <SearchTrips trips={trips} onBook={handleOpenBookingModal} userBookings={bookings} profile={profile} onViewTripDetails={handleViewTripDetails} />;
      case 'post': return <PostTrip onPost={handlePostTrip} profile={profile} onManageVehicles={() => setIsVehicleModalOpen(true)} />;
      case 'bookings': return <BookingsList bookings={bookings} trips={trips} profile={profile} onRefresh={refreshAllData} onViewTripDetails={handleViewTripDetails} />;
      case 'manage-trips': return <TripManagement profile={profile} trips={trips} bookings={staffBookings} onRefresh={refreshAllData} onViewTripDetails={handleViewTripDetails} />;
      case 'manage-orders': return <OrderManagement profile={profile} trips={trips} onRefresh={refreshAllData} onViewTripDetails={handleViewTripDetails} />;
      case 'admin': return profile?.role === 'admin' ? <AdminPanel /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} userBookings={bookings} profile={profile} onViewTripDetails={handleViewTripDetails} />;
      default: return <SearchTrips trips={trips} onBook={handleOpenBookingModal} userBookings={bookings} profile={profile} onViewTripDetails={handleViewTripDetails} />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        notifications={notifications} 
        clearNotification={(id) => setNotifications(n => n.map(x => x.id === id ? {...x, read: true} : x))} 
        profile={profile}
        profileLoading={profileLoading}
        onLoginClick={() => setIsAuthModalOpen(true)} 
        onProfileClick={() => !user ? setIsAuthModalOpen(true) : setIsProfileModalOpen(true)}
        pendingOrderCount={pendingOrderCount} // Pass the count here
      >
        <div className="animate-slide-up">{renderContent()}</div>
      </Layout>
      {selectedTrip && <BookingModal trip={selectedTrip} profile={profile} isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} onConfirm={handleConfirmBooking} />}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => refreshAllData()} />
      <ProfileManagement isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} profile={profile} onUpdate={() => user && fetchProfile(user.id)} stats={userStats} allTrips={trips} userBookings={bookings} onManageVehicles={() => setIsVehicleModalOpen(true)} />
      {selectedTrip && <TripDetailModal trip={selectedTrip} currentBookings={selectedTripBookings} profile={profile} isOpen={isTripDetailModalOpen} onClose={() => { setIsTripDetailModalOpen(false); refreshAllData(); }} onRefresh={() => fetchSelectedTripDetails(selectedTrip.id)} />}
      <VehicleManagementModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} profile={profile} onVehiclesUpdated={refreshAllData} />
    </>
  );
};

export default App;
