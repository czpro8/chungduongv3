
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [userStats, setUserStats] = useState({ tripsCount: 0, bookingsCount: 0 });
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const prevBookingsRef = useRef<Booking[]>([]);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
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
        driver_name: t.profiles?.full_name || 'Tài xế ẩn danh',
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
    
    if (error) {
      console.error("Error fetching bookings:", error);
      return;
    }
    const newList = data || [];
    setBookings(newList);
    return newList;
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
    
    let query = supabase
      .from('bookings')
      .select('*, profiles:passenger_id(full_name, phone), trips(*)');

    if (userProfile.role === 'driver') {
      const { data: myTrips } = await supabase.from('trips').select('id').eq('driver_id', userProfile.id);
      const myTripIds = myTrips?.map(t => t.id) || [];
      if (myTripIds.length > 0) {
        query = query.in('trip_id', myTripIds);
      } else {
        setStaffBookings([]);
        return;
      }
    }

    const { data } = await query.order('created_at', { ascending: false });
    const newList = data || [];
    setStaffBookings(newList);
    return newList;
  }, []);

  const fetchUserStats = useCallback(async (userId: string) => {
    if (!userId) return;
    const { count: tripsCount } = await supabase.from('trips').select('*', { count: 'exact', head: true }).eq('driver_id', userId);
    const { count: bookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('passenger_id', userId);
    setUserStats({ tripsCount: tripsCount || 0, bookingsCount: bookingsCount || 0 });
  }, []);

  const refreshAllData = useCallback(() => {
    fetchTrips();
    if (user?.id) {
      fetchUserBookings(user.id);
      fetchUserStats(user.id);
      if (profile) fetchStaffBookings(profile);
    }
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats, user?.id, profile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setBookings([]);
        setStaffBookings([]);
        setUserStats({ tripsCount: 0, bookingsCount: 0 });
      }
    });

    fetchTrips();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchTrips, fetchProfile]);

  useEffect(() => {
    if (user?.id) {
      fetchUserBookings(user.id);
      fetchUserStats(user.id);
    }
  }, [user?.id, fetchUserBookings, fetchUserStats]);

  useEffect(() => {
    if (profile) {
      fetchStaffBookings(profile);
    }
  }, [profile, fetchStaffBookings]);

  useEffect(() => {
    const channel = supabase.channel('app-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchTrips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        // Cập nhật dữ liệu ngầm
        refreshAllData();

        // Xử lý thông báo
        if (user?.id) {
          // 1. Dành cho Hành khách: Đơn hàng thay đổi trạng thái
          if (eventType === 'UPDATE' && newRecord.passenger_id === user.id) {
            if (newRecord.status !== oldRecord.status) {
              const statusMap: any = { CONFIRMED: 'được duyệt', REJECTED: 'bị từ chối', EXPIRED: 'hết hạn' };
              const statusLabel = statusMap[newRecord.status] || newRecord.status;
              addNotification(
                'Cập nhật đơn hàng', 
                `Đơn hàng S${newRecord.id.substring(0,5).toUpperCase()} của bạn đã ${statusLabel}.`,
                newRecord.status === 'CONFIRMED' ? 'success' : 'warning'
              );
            }
          }

          // 2. Dành cho Tài xế: Có khách đặt chỗ mới
          if (eventType === 'INSERT' && profile?.role === 'driver') {
             // Cần kiểm tra xem trip_id này có phải của driver này không
             supabase.from('trips').select('driver_id').eq('id', newRecord.trip_id).single()
               .then(({data}) => {
                 if (data && data.driver_id === user.id) {
                   addNotification(
                     'Yêu cầu mới', 
                     `Bạn có khách hàng mới vừa đặt ${newRecord.seats_booked} ghế. Vui lòng kiểm tra đơn hàng.`,
                     'info'
                   );
                 }
               });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrips, fetchUserBookings, fetchStaffBookings, fetchUserStats, user?.id, profile, refreshAllData]);

  // Background worker để tự động cập nhật trạng thái chuyến đi và xử lý đơn hàng hết hạn
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      let hasGlobalChanges = false;

      // 1. Quét Trips để cập nhật trạng thái tự động
      for (const trip of trips) {
        if (trip.status === TripStatus.CANCELLED || trip.status === TripStatus.COMPLETED) continue;

        const departure = new Date(trip.departure_time);
        const arrival = trip.arrival_time ? new Date(trip.arrival_time) : new Date(departure.getTime() + 3 * 60 * 60 * 1000);
        
        let targetStatus = trip.status;

        if (now > arrival) {
          targetStatus = TripStatus.COMPLETED;
        } else if (now >= departure && now <= arrival) {
          targetStatus = TripStatus.ON_TRIP;
        } else {
          const diffMins = Math.floor((departure.getTime() - now.getTime()) / 60000);
          if (diffMins <= 60 && diffMins > 0) {
            targetStatus = TripStatus.PREPARING;
          }
        }

        if (targetStatus !== trip.status) {
          hasGlobalChanges = true;
          await supabase.from('trips').update({ status: targetStatus }).eq('id', trip.id);
        }
      }

      // 2. Quét Bookings để xử lý hết hạn (Quá 2 tiếng từ giờ khởi hành)
      const { data: pendingBookings } = await supabase
        .from('bookings')
        .select('*, trips(departure_time)')
        .in('status', ['PENDING', 'CONFIRMED']);

      if (pendingBookings) {
        for (const booking of pendingBookings) {
          if (!booking.trips) continue;
          
          const departure = new Date(booking.trips.departure_time);
          const timeSinceDeparture = now.getTime() - departure.getTime();
          const twoHoursInMs = 2 * 60 * 60 * 1000;

          if (timeSinceDeparture > twoHoursInMs) {
            hasGlobalChanges = true;
            await supabase
              .from('bookings')
              .update({ status: 'EXPIRED' })
              .eq('id', booking.id);
          }
        }
      }

      if (hasGlobalChanges) refreshAllData();
    }, 60000); // Chạy mỗi phút 1 lần

    return () => clearInterval(interval);
  }, [trips, refreshAllData]);

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
        status: TripStatus.PREPARING 
      }));
      
      const { error } = await supabase.from('trips').insert(formattedTrips);
      if (error) throw error;
      
      refreshAllData();
      setActiveTab('manage-trips');
    } catch (err: any) {
      alert('Lỗi khi đăng chuyến: ' + err.message);
    }
  };

  const handleConfirmBooking = async (data: { phone: string; seats: number; note: string }) => {
    if (!selectedTrip || !user) return;
    const { data: latestTrip } = await supabase.from('trips').select('available_seats, status').eq('id', selectedTrip.id).single();
    
    if (latestTrip && (latestTrip.status === TripStatus.CANCELLED || latestTrip.status === TripStatus.COMPLETED)) {
      alert('Xin lỗi, chuyến xe này không còn khả dụng.');
      return;
    }

    const { data: newBooking, error: bookingError } = await supabase.from('bookings').insert({
      trip_id: selectedTrip.id,
      passenger_id: user.id,
      passenger_phone: data.phone,
      seats_booked: data.seats,
      total_price: selectedTrip.price * data.seats,
      status: 'PENDING'
    }).select().single();

    if (bookingError) {
      alert('Lỗi đặt chỗ: ' + bookingError.message);
    } else {
      const newAvailable = (latestTrip?.available_seats || 0) - data.seats;
      if (newAvailable <= 0) {
        await supabase.from('trips').update({ status: TripStatus.FULL }).eq('id', selectedTrip.id);
      }
      setIsBookingModalOpen(false);
      refreshAllData();
      setActiveTab('bookings');
      addNotification('Đặt chỗ thành công', 'Yêu cầu của bạn đang chờ tài xế duyệt.', 'success');
    }
  };

  const handleOpenBookingModal = (tripId: string) => {
    if (!user) { setIsAuthModalOpen(true); return; }
    const trip = trips.find(t => t.id === tripId);
    if (trip) { 
      const statusLabel = getTripStatusDisplay(trip).label;
      if (statusLabel === 'Hoàn thành' || statusLabel === 'Đang chạy' || statusLabel === 'Huỷ') {
        alert('Chuyến xe này hiện không thể nhận thêm khách.');
        return;
      }
      setSelectedTrip(trip); 
      setIsBookingModalOpen(true); 
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return profile && ['admin', 'manager', 'driver'].includes(profile.role) ? <Dashboard bookings={staffBookings} trips={trips} /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} userBookings={bookings} />;
      case 'search': return <SearchTrips trips={trips} onBook={handleOpenBookingModal} userBookings={bookings} />;
      case 'post': return <PostTrip onPost={handlePostTrip} />;
      case 'bookings': return <BookingsList bookings={bookings} trips={trips} onRefresh={refreshAllData} />;
      case 'manage-trips': return <TripManagement profile={profile} trips={trips} bookings={staffBookings} onRefresh={fetchTrips} />;
      case 'manage-orders': return <OrderManagement profile={profile} trips={trips} onRefresh={refreshAllData} />;
      case 'profile': return (
        <ProfileManagement 
          profile={profile} 
          onUpdate={() => user && fetchProfile(user.id)} 
          stats={userStats} 
          allTrips={trips}
          userBookings={bookings}
        />
      );
      case 'admin': return profile?.role === 'admin' ? <AdminPanel /> : <SearchTrips trips={trips} onBook={handleOpenBookingModal} userBookings={bookings} />;
      default: return null;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        notifications={notifications} 
        clearNotification={(id) => setNotifications(n => n.map(x => x.id === id ? {...x, read: true} : x))}
        profile={profile}
        onLoginClick={() => setIsAuthModalOpen(true)}
      >
        <div className="animate-slide-up">
          {renderContent()}
        </div>
      </Layout>
      {selectedTrip && (
        <BookingModal 
          trip={selectedTrip} 
          profile={profile} 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)} 
          onConfirm={handleConfirmBooking} 
        />
      )}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={() => refreshAllData()} />
    </>
  );
};

export default App;
