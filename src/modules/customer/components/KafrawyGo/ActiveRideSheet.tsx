import React from 'react';
import { motion } from 'motion/react';
import { Phone, Star, ShieldCheck, MapPin, Navigation, XCircle, CheckCircle2, Clock } from 'lucide-react';
import { Ride, RideStatus } from '../../services/mobilityApi';

interface ActiveRideSheetProps {
  ride: Ride;
  liveETA: { minutes: number; distance: number } | null;
  onCancelRide: () => void;
}

export const ActiveRideSheet: React.FC<ActiveRideSheetProps> = ({
  ride,
  liveETA,
  onCancelRide,
}) => {
  const getStatusHeadline = (status: RideStatus) => {
    switch (status) {
      case 'driver_assigned':
        return {
          badge: 'الكابتن قادم إليك',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          title: liveETA ? `يصل خلال ${liveETA.minutes} دقيقة` : 'الكابتن في طريقه إليك',
          subtitle: liveETA ? `على بعد ${liveETA.distance} كم من موقعك` : 'جاري تحديث الموقع اللحظي...',
        };
      case 'arrived':
        return {
          badge: 'وصل الكابتن 📍',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          title: 'الكابتن بانتظارك في نقطة الركوب',
          subtitle: 'يرجى التوجه إلى المركبة لبدء الرحلة',
        };
      case 'in_transit':
        return {
          badge: 'في الطريق إلى الوجهة 🚕',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          title: 'الرحلة جارية بأمان',
          subtitle: `متجه إلى: ${ride.dropoff_address_text}`,
        };
      default:
        return {
          badge: 'الرحلة قيد المتابعة',
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
          title: 'متابعة مباشرة',
          subtitle: '',
        };
    }
  };

  const statusInfo = getStatusHeadline(ride.status);

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="w-full max-w-lg mx-auto bg-white rounded-t-[32px] shadow-2xl border border-slate-100 overflow-hidden pb-safe dir-rtl"
    >
      {/* Status Banner */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusInfo.badgeColor}`}
            >
              {statusInfo.badge}
            </span>
          </div>
          <h3 className="text-lg font-black">{statusInfo.title}</h3>
          <p className="text-xs text-slate-300 font-medium">{statusInfo.subtitle}</p>
        </div>

        {liveETA && ride.status === 'driver_assigned' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/10 min-w-[75px]">
            <div
              className="text-2xl font-black text-emerald-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {liveETA.minutes}
            </div>
            <span className="text-[10px] font-bold text-slate-300">دقيقة</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Driver Profile Card */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl overflow-hidden shadow-inner shrink-0 border border-slate-300">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${ride.driver_id || 'captain-kfs'}&backgroundColor=e2e8f0`}
                alt="Captain"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">{ride.driver_name || 'كابتن كفراوي معتمد'}</h4>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>4.9</span>
                <span className="text-slate-400 font-medium text-[10px] mr-1">(أكثر من 150 رحلة)</span>
              </div>
            </div>
          </div>

          {/* Vehicle License Plate */}
          <div className="text-left">
            <div className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <div
                className="text-xs font-black text-slate-900 tracking-wider"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ل ق ر 9514
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 mt-1">هيونداي إلنترا فضي</div>
          </div>
        </div>

        {/* Progress Tracker Timeline */}
        <div className="px-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

            {/* Step 1 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  ['driver_assigned', 'arrived', 'in_transit', 'completed'].includes(ride.status)
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-600">قبول الطلب</span>
            </div>

            {/* Step 2 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  ['arrived', 'in_transit', 'completed'].includes(ride.status)
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-600">وصل الكابتن</span>
            </div>

            {/* Step 3 */}
            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                  ['in_transit', 'completed'].includes(ride.status)
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                <Navigation className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-600">في الطريق</span>
            </div>
          </div>
        </div>

        {/* Fare & Call Actions */}
        <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">الأجرة المقدرة</span>
            <div
              className="text-lg font-black text-emerald-700"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {ride.estimated_fare} <span className="text-xs font-ibm-plex text-slate-600">ج.م</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ride.driver_phone && (
              <a
                href={`tel:${ride.driver_phone}`}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>اتصال بالكابتن</span>
              </a>
            )}

            {ride.status === 'driver_assigned' && (
              <button
                onClick={onCancelRide}
                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs flex items-center gap-1 border border-rose-200 transition-all active:scale-95 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
