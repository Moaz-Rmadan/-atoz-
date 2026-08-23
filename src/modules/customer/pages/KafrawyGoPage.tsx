import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  mobilityApi,
  DriverProfile,
  Vehicle,
  Ride,
  LocationUpdate,
  RideStatus,
} from '../services/mobilityApi';
import { runMobilityIntegrationTest, TestLog } from '../tests/mobilityIntegration.test';
import { geolocationService } from '../services/geolocationService';
import { mapService, RouteResult } from '../services/mapService';
import { fareEngine, FareBreakdown } from '../services/fareEngine';
import { driverLocationService } from '../services/driverLocationService';
import { supabase } from '../../../lib/supabase';
import {
  ChevronRight,
  Search,
  MapPin,
  Car,
  Shield,
  Activity,
  History,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Bell,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// Modular Kafrawy Go Components
import { GoMap } from '../components/KafrawyGo/GoMap';
import { DestinationSheet } from '../components/KafrawyGo/DestinationSheet';
import { FarePreviewSheet } from '../components/KafrawyGo/FarePreviewSheet';
import { SearchingCaptainSheet } from '../components/KafrawyGo/SearchingCaptainSheet';
import { ActiveRideSheet } from '../components/KafrawyGo/ActiveRideSheet';
import { RideCompletedModal } from '../components/KafrawyGo/RideCompletedModal';
import { CaptainDashboardView } from '../components/KafrawyGo/CaptainDashboardView';
import { GpsPermissionSheet } from '../components/KafrawyGo/GpsPermissionSheet';
import { FieldTestConsole } from '../components/KafrawyGo/FieldTestConsole/FieldTestConsole';
import { CaptainVehiclesView } from '../components/KafrawyGo/CaptainVehiclesView';

interface KafrawyGoPageProps {
  onBackToDashboard: () => void;
}

export const KafrawyGoPage: React.FC<KafrawyGoPageProps> = ({ onBackToDashboard }) => {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  // Active View Tab: 'passenger' | 'captain' | 'captain_vehicles' | 'register_captain' | 'qa_audit'
  const [activeTab, setActiveTab] = useState<
    'passenger' | 'captain' | 'captain_vehicles' | 'register_captain' | 'qa_audit'
  >('passenger');
  const [isLoading, setIsLoading] = useState(true);

  // User GPS & Locations
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 31.4055,
    lng: 31.7385,
  });
  const [pickupText, setPickupText] = useState('موقعي الحالي (كفر البطيخ)');
  const [dropoffText, setDropoffText] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [fareBreakdown, setFareBreakdown] = useState<FareBreakdown | null>(null);

  // Sheets & Modals State
  const [showDestinationSheet, setShowDestinationSheet] = useState(false);
  const [showFarePreviewSheet, setShowFarePreviewSheet] = useState(false);
  const [showGpsSheet, setShowGpsSheet] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Customer Ride Workflow State
  const [isBooking, setIsBooking] = useState(false);
  const [activeCustomerRide, setActiveCustomerRide] = useState<Ride | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Ride[]>([]);
  const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
  const [liveETA, setLiveETA] = useState<{ distance: number; minutes: number } | null>(null);
  const [completedRideForRating, setCompletedRideForRating] = useState<Ride | null>(null);

  // Driver Profile & Captain State
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [activeDriverRide, setActiveDriverRide] = useState<Ride | null>(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [driverHistory, setDriverHistory] = useState<Ride[]>([]);
  const [isRefreshingAvailable, setIsRefreshingAvailable] = useState(false);

  // Driver Onboarding Registration Form State
  const [nationalId, setNationalId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [make, setMake] = useState('هيونداي');
  const [model, setModel] = useState('إلنترا');
  const [year, setYear] = useState(new Date().getFullYear());
  const [plateNumber, setPlateNumber] = useState('');
  const [color, setColor] = useState('فضي');
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);

  // QA Audit Integration Test State
  const [testLogs, setTestLogs] = useState<TestLog[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testMetrics, setTestMetrics] = useState<{ passed: number; failed: number; total: number } | null>(null);

  const trackerIntervalRef = useRef<any>(null);

  // Initial GPS Location Fetch
  const requestCurrentLocation = async (isManual = false) => {
    setIsLocating(true);
    try {
      const coords = await geolocationService.requestCurrentPosition();
      const newPos = { lat: coords.latitude, lng: coords.longitude };
      setUserCoords(newPos);
      setPickupCoords(newPos);
      setShowGpsSheet(false);
      if (isManual) {
        success('تم تحديد موقعك الجغرافي بنجاح!');
      }
    } catch (err: any) {
      console.warn('GPS prompt info:', err.message);
      if (isManual) {
        toastError('تعذر تحديد الموقع الجغرافي. يمكنك إدخال نقطة الانطلاق يدوياً.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    requestCurrentLocation();
  }, []);

  // Live ETA Calculation
  useEffect(() => {
    if (activeCustomerRide && driverLocation) {
      let targetLat = activeCustomerRide.pickup_latitude;
      let targetLng = activeCustomerRide.pickup_longitude;

      if (activeCustomerRide.status === 'in_transit') {
        targetLat = activeCustomerRide.dropoff_latitude;
        targetLng = activeCustomerRide.dropoff_longitude;
      }

      const R = 6371;
      const dLat = ((targetLat - driverLocation.latitude) * Math.PI) / 180;
      const dLng = ((targetLng - driverLocation.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((driverLocation.latitude * Math.PI) / 180) *
          Math.cos((targetLat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c * 1.3;
      const mins = Math.max(1, Math.round((dist / 30) * 60));
      setLiveETA({ distance: Number(dist.toFixed(1)), minutes: mins });
    } else {
      setLiveETA(null);
    }
  }, [activeCustomerRide, driverLocation]);

  // Load initial backend data
  useEffect(() => {
    if (user) {
      loadInitialMobilityData();
    }
    return () => {
      stopTracker();
    };
  }, [user]);

  // Periodic refresher for available rides if driver is online
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (driverProfile && driverProfile.approval_status === 'approved' && driverProfile.is_online) {
      loadAvailableRides();
      interval = setInterval(() => {
        loadAvailableRides();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [driverProfile]);

  // Handle active customer ride tracking updates
  useEffect(() => {
    if (activeCustomerRide && ['driver_assigned', 'arrived', 'in_transit'].includes(activeCustomerRide.status)) {
      startTracker();
    } else {
      stopTracker();
    }
  }, [activeCustomerRide]);

  // Monitor active driver ride to automatically trigger background tracking
  useEffect(() => {
    if (
      activeDriverRide &&
      ['driver_assigned', 'arrived', 'in_transit'].includes(activeDriverRide.status) &&
      driverProfile
    ) {
      driverLocationService.startTracking(activeDriverRide.id, driverProfile.id);
    } else {
      driverLocationService.stopTracking();
    }
    return () => {
      driverLocationService.stopTracking();
    };
  }, [activeDriverRide, driverProfile]);

  const loadInitialMobilityData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const dp = await mobilityApi.getDriverProfile(user.id);
      setDriverProfile(dp);

      if (dp) {
        const vehs = await mobilityApi.getDriverVehicles(dp.id);
        setVehicles(vehs);
        if (vehs.length > 0) {
          setSelectedVehicleId(vehs[0].id);
        }

        if (dp.approval_status === 'approved') {
          const activeRide = await mobilityApi.getActiveDriverRide(dp.id);
          setActiveDriverRide(activeRide);

          const dHist = await mobilityApi.getDriverRideHistory(dp.id);
          setDriverHistory(dHist);
        }
      }

      const custRide = await mobilityApi.getActiveCustomerRide(user.id);
      setActiveCustomerRide(custRide);

      const cHist = await mobilityApi.getCustomerRideHistory(user.id);
      setCustomerHistory(cHist);
    } catch (e) {
      console.error('Error loading mobility data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableRides = async () => {
    if (!driverProfile) return;
    setIsRefreshingAvailable(true);
    try {
      const list = await mobilityApi.getAvailableRides();
      setAvailableRides(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingAvailable(false);
    }
  };

  // Realtime Supabase Tracking
  const startTracker = () => {
    if (!activeCustomerRide) return;
    stopTracker();

    const channel = supabase
      .channel(`public:ride_location_updates:ride_id=eq.${activeCustomerRide.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_location_updates',
          filter: `ride_id=eq.${activeCustomerRide.id}`,
        },
        (payload: any) => {
          setDriverLocation(payload.new as LocationUpdate);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${activeCustomerRide.id}`,
        },
        async (payload: any) => {
          const updatedRide = payload.new as Ride;
          if (updatedRide.status === 'completed' || updatedRide.status === 'cancelled') {
            const finishedRide = updatedRide;
            setActiveCustomerRide(null);
            setDriverLocation(null);
            stopTracker();

            const cHist = await mobilityApi.getCustomerRideHistory(user!.id);
            setCustomerHistory(cHist);

            if (finishedRide.status === 'completed') {
              setCompletedRideForRating(finishedRide);
              success('وصلت بالسلامة! نشكرك على استخدام كفراوي Go.');
            } else {
              info('تم إلغاء الرحلة.');
            }
          } else {
            setActiveCustomerRide(updatedRide);
          }
        }
      )
      .subscribe();

    trackerIntervalRef.current = channel;
  };

  const stopTracker = () => {
    const channel = trackerIntervalRef.current;
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
    trackerIntervalRef.current = null;
  };

  // Calculate Route & Fare Breakdown
  const handleCalculateRouteAndFare = async () => {
    if (!pickupText.trim() || !dropoffText.trim()) {
      setSearchErrorMessage('يرجى تحديد مكان الانطلاق والوجهة بدقة.');
      return;
    }

    setIsCalculatingRoute(true);
    setSearchErrorMessage(null);

    try {
      // 1. Geocode locations
      const pickupResult = await mapService.geocode(pickupText);
      const dropoffResult = await mapService.geocode(dropoffText);

      setPickupCoords({ lat: pickupResult.latitude, lng: pickupResult.longitude });
      setDropoffCoords({ lat: dropoffResult.latitude, lng: dropoffResult.longitude });

      // 2. Calculate Road Polyline and Distance via OSRM
      const route = await mapService.calculateRoute(
        pickupResult.latitude,
        pickupResult.longitude,
        dropoffResult.latitude,
        dropoffResult.longitude
      );

      setRouteCoordinates(route.coordinates);

      // 3. Compute Fare Breakdown
      const breakdown = fareEngine.calculateBreakdown(route.distanceKm, route.durationMinutes);
      setFareBreakdown(breakdown);

      setShowDestinationSheet(false);
      setShowFarePreviewSheet(true);
    } catch (err: any) {
      console.error('Route calculation error:', err);
      setSearchErrorMessage(err.message || 'تعذر حساب المسار. يرجى التحقق من صحة العناوين المدخلة.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Passenger Request Ride
  const handleRequestRide = async () => {
    if (!user || !pickupCoords || !dropoffCoords || !fareBreakdown) return;

    setIsBooking(true);
    setShowFarePreviewSheet(false);

    try {
      const ride = await mobilityApi.requestRide(user.id, {
        pickupText,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffText,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
        estimatedFare: fareBreakdown.finalFare,
      });

      setActiveCustomerRide(ride);
      success('تم إرسال طلبك لكباتن كفراوي! جاري البحث عن أقرب كابتن متاح...');
    } catch (e: any) {
      toastError(e.message || 'تعذر إرسال طلب الرحلة.');
      setIsBooking(false);
    }
  };

  // Passenger Cancel Ride
  const handleCancelRideAsCustomer = async () => {
    if (!activeCustomerRide || !user) return;
    if (!window.confirm('هل أنت متأكد من رغبتك في إلغاء طلب الرحلة الحالي؟')) return;

    try {
      await mobilityApi.cancelRide(activeCustomerRide.id, user.id);
      success('تم إلغاء الرحلة بنجاح.');
      setActiveCustomerRide(null);
      setDriverLocation(null);
      setIsBooking(false);
      setRouteCoordinates([]);
      setFareBreakdown(null);
      stopTracker();

      const cHist = await mobilityApi.getCustomerRideHistory(user.id);
      setCustomerHistory(cHist);
    } catch (e: any) {
      toastError(e.message || 'فشل إلغاء الرحلة.');
    }
  };

  // Driver Toggle Online
  const handleToggleOnline = async () => {
    if (!driverProfile) return;
    const newStatus = !driverProfile.is_online;
    try {
      await mobilityApi.setDriverOnlineStatus(driverProfile.id, newStatus);
      setDriverProfile({
        ...driverProfile,
        is_online: newStatus,
      });
      if (newStatus) {
        success('أنت الآن متصل بالإنترنت ومستعد لتلقي طلبات الركاب!');
        loadAvailableRides();
      } else {
        info('لقد أصبحت غير متصل بالإنترنت.');
        setAvailableRides([]);
      }
    } catch (e: any) {
      toastError(e.message || 'فشل تغيير حالة الاتصال.');
    }
  };

  // Driver Accept Ride
  const handleAcceptRide = async (rideId: string) => {
    if (!driverProfile) return;
    if (!selectedVehicleId) {
      toastError('يرجى تسجيل وتفعيل مركبة أولاً لتتمكن من تشغيل الرحلات.');
      return;
    }

    try {
      await mobilityApi.acceptRide(rideId, driverProfile.id, selectedVehicleId);
      success('تهانينا! لقد قبلت الرحلة. توجه الآن لنقطة التقاء العميل.');

      const activeRide = await mobilityApi.getActiveDriverRide(driverProfile.id);
      setActiveDriverRide(activeRide);
      setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));

      try {
        const coords = await geolocationService.requestCurrentPosition();
        await mobilityApi.sendLocationUpdate(
          rideId,
          driverProfile.id,
          coords.latitude,
          coords.longitude,
          coords.heading || 0
        );
        driverLocationService.startTracking(rideId, driverProfile.id);
      } catch (gpsError: any) {
        console.warn('GPS initial capture warning, using fallback coordinate:', gpsError?.message || gpsError);
        const fallbackLat = userCoords?.lat || 31.4055;
        const fallbackLng = userCoords?.lng || 31.7385;
        await mobilityApi.sendLocationUpdate(rideId, driverProfile.id, fallbackLat, fallbackLng, 0);
        driverLocationService.startTracking(rideId, driverProfile.id);
      }
    } catch (e: any) {
      toastError(e.message || 'فشل قبول الرحلة، ربما تم قبولها من كابتن آخر.');
      loadAvailableRides();
    }
  };

  // Driver Advance status
  const handleAdvanceStatus = async () => {
    if (!activeDriverRide || !driverProfile) return;

    let nextStatus: RideStatus;
    let successMsg = '';

    if (activeDriverRide.status === 'driver_assigned') {
      nextStatus = 'arrived';
      successMsg = 'تم تسجيل وصولك لموقع العميل بنجاح. بانتظار صعود العميل.';
    } else if (activeDriverRide.status === 'arrived') {
      nextStatus = 'in_transit';
      successMsg = 'بدأت الرحلة الآن! توجه نحو الوجهة المحددة للعميل.';
    } else if (activeDriverRide.status === 'in_transit') {
      nextStatus = 'completed';
      successMsg = 'تم إكمال الرحلة بنجاح! العميل سيسدد الأجرة نقداً.';
    } else {
      return;
    }

    try {
      await mobilityApi.updateRideStatus(activeDriverRide.id, nextStatus, activeDriverRide.estimated_fare || 0);
      success(successMsg);

      if (nextStatus === 'completed') {
        driverLocationService.stopTracking();
        setActiveDriverRide(null);
        const dHist = await mobilityApi.getDriverRideHistory(driverProfile.id);
        setDriverHistory(dHist);
      } else {
        setActiveDriverRide({
          ...activeDriverRide,
          status: nextStatus,
        });

        try {
          const coords = await geolocationService.requestCurrentPosition();
          await mobilityApi.sendLocationUpdate(
            activeDriverRide.id,
            driverProfile.id,
            coords.latitude,
            coords.longitude,
            coords.heading || 0
          );
        } catch (gpsError) {
          console.warn('GPS location update skipped:', gpsError);
        }
      }
    } catch (e: any) {
      toastError(e.message || 'فشل تحديث حالة الرحلة.');
    }
  };

  // Submit Rating
  const handleSubmitRating = (rating: number, comment?: string) => {
    success(`شكرًا لك! تم إرسال تقييم ${rating} نجوم للكابتن بنجاح.`);
    setCompletedRideForRating(null);
  };

  // Driver Onboarding Form submit
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!nationalId.trim() || !licenseNumber.trim() || !make.trim() || !model.trim() || !plateNumber.trim()) {
      toastError('يرجى ملء كافة الحقول المطلوبة.');
      return;
    }

    setIsSubmittingOnboarding(true);
    try {
      const drv = await mobilityApi.registerDriver(user.id, nationalId, licenseNumber);
      await mobilityApi.addVehicle(drv.id, {
        make,
        model,
        year,
        plateNumber,
        color,
      });

      success('تم إرسال طلبك بنجاح! سيتم مراجعة مستنداتك وتفعيل الحساب قريباً.');
      const dp = await mobilityApi.getDriverProfile(user.id);
      setDriverProfile(dp);
      setActiveTab('captain');
    } catch (e: any) {
      toastError(e.message || 'فشل إرسال طلب الانضمام.');
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  return (
    <div
      className="relative w-full h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden select-none dir-rtl"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* 1. INTERACTIVE MAP ENGINE (Centric Viewport) */}
      <GoMap
        userLocation={userCoords}
        pickupLocation={pickupCoords}
        dropoffLocation={dropoffCoords}
        driverLocation={
          driverLocation
            ? {
                lat: driverLocation.latitude,
                lng: driverLocation.longitude,
                heading: driverLocation.heading,
              }
            : null
        }
        routeCoordinates={routeCoordinates}
        onRecenter={() => requestCurrentLocation(true)}
      />

      {/* 2. TOP FLOATING APP BAR */}
      <header className="absolute top-3 inset-x-3 z-30 flex items-center justify-between max-w-lg mx-auto pointer-events-auto">
        {/* Back Button */}
        <button
          onClick={onBackToDashboard}
          className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all cursor-pointer"
          title="العودة للرئيسية"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Tab Switcher (Passenger / Captain / History) */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-md border border-slate-200/80 flex items-center gap-1">
          <button
            onClick={() => setActiveTab('passenger')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'passenger'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            الركاب
          </button>
          <button
            onClick={() => setActiveTab('captain')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'captain' || activeTab === 'register_captain' || activeTab === 'captain_vehicles'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            الكباتن
          </button>
        </div>

        {/* History / Audit Button */}
        <button
          onClick={() => setActiveTab('qa_audit')}
          className={`w-11 h-11 rounded-2xl shadow-md border flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
            activeTab === 'qa_audit'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200/80 hover:bg-slate-50'
          }`}
          title="سجل الرحلات والجودة"
        >
          <History className="w-5 h-5" />
        </button>
      </header>

      {/* 3. FLOATING CONTENT & BOTTOM SHEETS LAYER */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end pointer-events-none max-w-lg mx-auto p-4 pb-6">
        <div className="w-full pointer-events-auto flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {/* PASSENGER FLOW: HOME SEARCH BAR */}
            {activeTab === 'passenger' && !activeCustomerRide && !isBooking && (
              <motion.div
                key="passenger-home-card"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="w-full bg-white/98 backdrop-blur-xl rounded-[28px] p-4 shadow-2xl border border-slate-200/80"
              >
                {/* Search Bar Trigger */}
                <button
                  onClick={() => setShowDestinationSheet(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200/80 text-right rounded-2xl p-3.5 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer mb-3 border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-xs">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">إلى أين تريد الذهاب؟</h4>
                      <p className="text-xs text-slate-400 font-medium">اختر وجهتك في كفر البطيخ ودمياط</p>
                    </div>
                  </div>
                  <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Quick Landmarks Chips */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { label: 'مستشفى كفر البطيخ 🏥', query: 'مستشفى كفر البطيخ المركزي' },
                    { label: 'محطة القطار 🚆', query: 'محطة قطار كفر البطيخ' },
                    { label: 'جامعة دمياط 🎓', query: 'جامعة دمياط' },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDropoffText(chip.query);
                        setShowDestinationSheet(true);
                      }}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASSENGER FLOW: ACTIVE RIDE IN TRANSIT */}
            {activeTab === 'passenger' && activeCustomerRide && (
              <ActiveRideSheet
                key="active-ride-sheet"
                ride={activeCustomerRide}
                liveETA={liveETA}
                onCancelRide={handleCancelRideAsCustomer}
              />
            )}

            {/* CAPTAIN FLOW: DASHBOARD VIEW */}
            {activeTab === 'captain' && (
              <motion.div
                key="captain-dashboard"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="w-full"
              >
                <CaptainDashboardView
                  driverProfile={driverProfile}
                  vehicles={vehicles}
                  selectedVehicleId={selectedVehicleId}
                  onManageVehicles={() => setActiveTab('captain_vehicles')}
                  activeRide={activeDriverRide}
                  availableRides={availableRides}
                  isOnline={driverProfile?.is_online ?? false}
                  onToggleOnline={handleToggleOnline}
                  onAcceptRide={handleAcceptRide}
                  onAdvanceRideStatus={handleAdvanceStatus}
                  onRefreshRides={loadAvailableRides}
                  isRefreshing={isRefreshingAvailable}
                  onRegisterClick={() => setActiveTab('register_captain')}
                />
              </motion.div>
            )}

            {/* CAPTAIN VEHICLES MANAGEMENT VIEW */}
            {activeTab === 'captain_vehicles' && (
              <motion.div
                key="captain-vehicles-view"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="w-full max-h-[82vh] overflow-y-auto rounded-3xl"
              >
                <CaptainVehiclesView
                  driverProfile={driverProfile}
                  selectedVehicleId={selectedVehicleId}
                  onSelectPrimaryVehicle={(vId) => setSelectedVehicleId(vId)}
                  onBack={async () => {
                    if (driverProfile?.id) {
                      const updatedVehs = await mobilityApi.getDriverVehicles(driverProfile.id);
                      setVehicles(updatedVehs);
                    }
                    setActiveTab('captain');
                  }}
                />
              </motion.div>
            )}

            {/* CAPTAIN REGISTRATION FORM */}
            {activeTab === 'register_captain' && (
              <motion.div
                key="register-captain-form"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="w-full bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[75vh] overflow-y-auto no-scrollbar"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-slate-900">تسجيل كابتن جديد</h3>
                  <button
                    onClick={() => setActiveTab('passenger')}
                    className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleOnboardingSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">الرقم القومي (14 رقم)</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="29901011234567"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">رقم رخصة القيادة</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="987654321"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-slate-900"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">ماركة السيارة</label>
                      <input
                        type="text"
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder="هيونداي"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">الموديل</label>
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="إلنترا"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">رقم اللوحة</label>
                      <input
                        type="text"
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value)}
                        placeholder="ل ق ر 9514"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">لون المركبة</label>
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="فضي"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingOnboarding}
                    className="w-full mt-4 py-3.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {isSubmittingOnboarding ? 'جاري إرسال الطلب...' : 'إرسال طلب الانضمام'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* QA AUDIT & FIELD TEST LAB VIEW */}
            {activeTab === 'qa_audit' && (
              <motion.div
                key="qa-audit-view"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="w-full max-h-[82vh] overflow-y-auto rounded-3xl"
              >
                <FieldTestConsole onClose={() => setActiveTab('passenger')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. MODALS & POPUPS */}
      {/* Destination Sheet */}
      <DestinationSheet
        isOpen={showDestinationSheet}
        onClose={() => setShowDestinationSheet(false)}
        pickupText={pickupText}
        setPickupText={setPickupText}
        dropoffText={dropoffText}
        setDropoffText={setDropoffText}
        onConfirmLocations={handleCalculateRouteAndFare}
        isLoading={isCalculatingRoute}
        errorMessage={searchErrorMessage}
      />

      {/* Fare Preview Sheet */}
      <FarePreviewSheet
        isOpen={showFarePreviewSheet}
        onClose={() => setShowFarePreviewSheet(false)}
        pickupAddress={pickupText}
        dropoffAddress={dropoffText}
        fareBreakdown={fareBreakdown}
        onRequestRide={handleRequestRide}
        isLoading={isBooking}
      />

      {/* Searching Captain Sheet */}
      <SearchingCaptainSheet
        isOpen={isBooking && !activeCustomerRide}
        onCancel={() => setIsBooking(false)}
        pickupAddress={pickupText}
        dropoffAddress={dropoffText}
        estimatedFare={fareBreakdown?.finalFare}
      />

      {/* Ride Completed Success & Rating Modal */}
      <RideCompletedModal
        isOpen={!!completedRideForRating}
        ride={completedRideForRating}
        onClose={() => setCompletedRideForRating(null)}
        onSubmitRating={handleSubmitRating}
      />

      {/* GPS Permission Prompt */}
      <GpsPermissionSheet
        isOpen={showGpsSheet}
        onClose={() => setShowGpsSheet(false)}
        onRequestGps={() => requestCurrentLocation(true)}
        onManualInput={() => {
          setShowGpsSheet(false);
          setShowDestinationSheet(true);
        }}
        isLoading={isLocating}
      />
    </div>
  );
};
