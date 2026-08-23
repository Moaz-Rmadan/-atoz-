import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car,
  DollarSign,
  TrendingUp,
  Star,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  User,
  Power,
  Shield,
  Activity,
  ChevronLeft,
} from 'lucide-react';
import { DriverProfile, Ride, RideStatus, Vehicle } from '../../services/mobilityApi';

interface CaptainDashboardViewProps {
  driverProfile: DriverProfile | null;
  vehicles?: Vehicle[];
  selectedVehicleId?: string;
  onManageVehicles?: () => void;
  activeRide: Ride | null;
  availableRides: Ride[];
  isOnline: boolean;
  onToggleOnline: () => void;
  onAcceptRide: (rideId: string) => void;
  onAdvanceRideStatus: () => void;
  onRefreshRides: () => void;
  isRefreshing: boolean;
  onRegisterClick: () => void;
}

export const CaptainDashboardView: React.FC<CaptainDashboardViewProps> = ({
  driverProfile,
  vehicles = [],
  selectedVehicleId = '',
  onManageVehicles,
  activeRide,
  availableRides,
  isOnline,
  onToggleOnline,
  onAcceptRide,
  onAdvanceRideStatus,
  onRefreshRides,
  isRefreshing,
  onRegisterClick,
}) => {
  const activeVehicles = vehicles.filter((v) => v.is_active);
  const primaryVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || activeVehicles[0];
  // Not registered as Captain fallback
  if (!driverProfile) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 text-center flex flex-col items-center dir-rtl">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 border border-amber-200">
          <Shield className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-black text-slate-900 mb-1">انضم لأسطول كباتن كفراوي</h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 max-w-xs">
          ضاعف دخلك اليومي وسجل سيارتك أو مركبتك في أكبر منصة نقل ذكي في محافظة كفر الشيخ.
        </p>
        <button
          onClick={onRegisterClick}
          className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer"
        >
          تقديم طلب انضمام ككابتن
        </button>
      </div>
    );
  }

  // Pending / Rejected Status
  if (driverProfile.approval_status !== 'approved') {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 text-center flex flex-col items-center dir-rtl">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 border border-amber-200">
          <Clock className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
        <h3 className="text-lg font-black text-slate-900 mb-1">
          {driverProfile.approval_status === 'pending' ? 'طلبك قيد المراجعة والتدقيق' : 'حساب الكابتن غير مفعل'}
        </h3>
        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4 max-w-xs">
          {driverProfile.approval_status === 'pending'
            ? 'يقوم فريق الجودة بمراجعة رخصة القيادة وبيانات المركبة. سيتم تفعيل حسابك فور استيفاء الشروط.'
            : 'تم رفض الطلب أو إيقاف الحساب مؤقتاً. يرجى التواصل مع الدعم الفني لمراجعة المستندات.'}
        </p>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs font-bold text-slate-600 w-full mb-4">
          رقم التسجيل: <span className="font-mono">{driverProfile.license_number}</span>
        </div>
      </div>
    );
  }

  // Active Ride Execution for Captain
  if (activeRide) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden dir-rtl">
        {/* Status Header */}
        <div
          className={`p-4 text-white text-center font-bold text-sm ${
            activeRide.status === 'driver_assigned'
              ? 'bg-amber-600'
              : activeRide.status === 'arrived'
              ? 'bg-emerald-600'
              : 'bg-blue-600'
          }`}
        >
          {activeRide.status === 'driver_assigned' && 'توجه الآن إلى موقع العميل 📍'}
          {activeRide.status === 'arrived' && 'أنت في نقطة الالتقاء - بانتظار صعود العميل'}
          {activeRide.status === 'in_transit' && 'الرحلة جارية - توجه نحو الوجهة المحددة'}
        </div>

        <div className="p-5 space-y-4">
          {/* Passenger Info & Call */}
          <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">الراكب</span>
                <h4 className="font-bold text-sm text-slate-900">{activeRide.customer_name || 'عميل كفراوي'}</h4>
              </div>
            </div>

            {activeRide.customer_phone && (
              <a
                href={`tel:${activeRide.customer_phone}`}
                className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs hover:bg-emerald-100"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Route Locations */}
          <div className="space-y-3 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">نقطة الركوب</span>
                <span className="text-xs font-bold text-slate-800">{activeRide.pickup_address_text}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">الوجهة المقصودة</span>
                <span className="text-xs font-bold text-slate-800">{activeRide.dropoff_address_text}</span>
              </div>
            </div>
          </div>

          {/* Expected Cash to Collect */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 block">المبلغ المطلوب تحصيله نقداً</span>
              <div
                className="text-xl font-black text-emerald-700"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {activeRide.estimated_fare} <span className="text-xs font-ibm-plex">ج.م</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
              الدفع كاش
            </span>
          </div>

          {/* State Machine Action Button */}
          {activeRide.status === 'driver_assigned' && (
            <button
              onClick={onAdvanceRideStatus}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              تأكيد الوصول لموقع العميل
            </button>
          )}

          {activeRide.status === 'arrived' && (
            <button
              onClick={onAdvanceRideStatus}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              بدء الرحلة (صعد العميل)
            </button>
          )}

          {activeRide.status === 'in_transit' && (
            <button
              onClick={onAdvanceRideStatus}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              إنهاء الرحلة واستلام {activeRide.estimated_fare} ج.م
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default Online / Offline Captain Dashboard
  return (
    <div className="flex flex-col gap-4 dir-rtl">
      {/* Online / Offline Toggle Card */}
      <div className="bg-white rounded-3xl p-4 shadow-md border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              isOnline ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400'
            }`}
          >
            <Power className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-900">{isOnline ? 'أنت متصل بالإنترنت' : 'أنت غير متصل'}</h4>
            <p className="text-[11px] text-slate-400 font-medium">
              {isOnline ? 'جاهز لاستقبال طلبات الركاب في كفر الشيخ' : 'اضغط للاتصال واستقبال طلبات الرحلات'}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleOnline}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer ${
            isOnline
              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isOnline ? 'إيقاف' : 'اتصال'}
        </button>
      </div>

      {/* Daily Performance Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -left-3 -bottom-3 opacity-10">
            <DollarSign className="w-20 h-20" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 block mb-1">أرباح اليوم</span>
          <div
            className="text-2xl font-black text-emerald-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            1,240 <span className="text-xs font-ibm-plex text-white">ج.م</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 block mb-1">الرحلات المكتملة</span>
          <div className="flex items-baseline justify-between">
            <div
              className="text-2xl font-black text-slate-900"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              14
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>4.9</span>
            </div>
          </div>
        </div>
      </div>

      {/* My Vehicles Card */}
      <div
        onClick={onManageVehicles}
        className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/90 flex items-center justify-between hover:border-slate-300 cursor-pointer transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200/60">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm text-slate-900">مركباتي</h4>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  activeVehicles.length > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {activeVehicles.length > 0
                  ? `${activeVehicles.length} ${activeVehicles.length === 1 ? 'مركبة نشطة' : 'مركبات نشطة'}`
                  : 'لا توجد مركبات'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {primaryVehicle
                ? `المركبة الحالية: ${primaryVehicle.make} ${primaryVehicle.model} (${primaryVehicle.plate_number})`
                : 'اضغط لإضافة وإدارة مركباتك واستقبال الرحلات'}
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200/80">
          <ChevronLeft className="w-4 h-4" />
        </div>
      </div>

      {/* Incoming Requests Section */}
      {isOnline ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm text-slate-900">طلبات الرحلات المتاحة</h4>
              {availableRides.length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full animate-pulse">
                  {availableRides.length} متاح
                </span>
              )}
            </div>

            <button
              onClick={onRefreshRides}
              disabled={isRefreshing}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>
          </div>

          {availableRides.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 text-center shadow-xs">
              <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <h5 className="font-bold text-sm text-slate-900 mb-1">لا توجد طلبات جديدة الآن</h5>
              <p className="text-xs text-slate-400 font-medium">
                سنقوم بتنبيهك تلقائياً بمجرد حجز أي عميل لرحلة بالقرب منك.
              </p>
            </div>
          ) : (
            availableRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-3xl p-4 shadow-md border border-emerald-100 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500" />

                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1.5 flex-1 pl-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">{ride.pickup_address_text}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 truncate">{ride.dropoff_address_text}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block">الأجرة</span>
                    <span
                      className="font-black text-emerald-700 text-sm"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {ride.estimated_fare}ج
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onAcceptRide(ride.id)}
                    className="flex-1 py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    قبول الرحلة فوراً
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 text-center shadow-xs">
          <p className="text-xs text-slate-500 font-medium">
            أنت في وضع غير متصل. قم بتفعيل زر الاتصال بالأعلى لبدء استقبال الركاب.
          </p>
        </div>
      )}
    </div>
  );
};
