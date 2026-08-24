import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Car,
  User,
  Phone,
  Banknote,
  Percent,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Shield,
  Activity,
} from 'lucide-react';
import { AdminRide, RideTimelineEvent } from '../types';
import { adminApi } from '../services/adminApi';
import { formatSafeTime, formatSafeDate } from '../utils/dateUtils';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface RideDetailsDrawerProps {
  ride: AdminRide | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCashPayment: (ride: AdminRide) => void;
}

export const RideDetailsDrawer: React.FC<RideDetailsDrawerProps> = ({
  ride,
  isOpen,
  onClose,
  onConfirmCashPayment,
}) => {
  const [timeline, setTimeline] = useState<RideTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    if (!ride) return;
    let isMounted = true;
    setLoadingTimeline(true);

    adminApi
      .getRideTimeline(ride.id, ride)
      .then((events) => {
        if (isMounted) {
          setTimeline(events);
          setLoadingTimeline(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching ride timeline:', err);
        if (isMounted) setLoadingTimeline(false);
      });

    return () => {
      isMounted = false;
    };
  }, [ride]);

  if (!isOpen || !ride) return null;

  const fare = ride.customer_total || ride.final_fare || ride.estimated_fare || 0;
  const commission = ride.platform_commission || Math.round(fare * 0.15 * 100) / 100;
  const netEarned = ride.driver_earning || Math.round((fare - commission) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden dir-rtl">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>تفاصيل الرحلة</span>
                  <span className="font-mono text-xs text-emerald-400">
                    #{ride.id.substring(0, 8)}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {new Date(ride.created_at).toLocaleString('ar-EG')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Status & Payment Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-slate-500 mb-1">حالة الرحلة الحالية:</div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      ride.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ride.status === 'cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-blue-100 text-blue-800'
                    }
                  >
                    {ride.status === 'completed'
                      ? 'مكتملة بنجاح'
                      : ride.status === 'cancelled'
                      ? 'ملغاة'
                      : ride.status === 'in_transit'
                      ? 'في الطريق'
                      : ride.status === 'arrived'
                      ? 'وصل الكابتن'
                      : ride.status === 'driver_assigned'
                      ? 'تم تعيين الكابتن'
                      : 'قيد البحث'}
                  </Badge>
                  {ride.distance_km && (
                    <span className="text-xs text-slate-500 font-semibold">
                      ~ {ride.distance_km} كم ({ride.duration_min} دقيقة)
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left">
                <div className="text-[11px] font-bold text-slate-500 mb-1">حالة الدفع:</div>
                {ride.payment_status === 'paid_cash' ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                    تم التحصيل نقداً
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                    كاش معلق للتحصيل
                  </span>
                )}
              </div>
            </div>

            {/* Financial Split (15% Commission / 85% Driver Net) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  تفاصيل الأجرة المالية (FinTech Cash Split)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                  نقداً Cash
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <div className="text-[10px] text-slate-400">إجمالي الأجرة</div>
                  <div className="text-base font-black text-white mt-0.5">{fare} ج.م</div>
                </div>

                <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-800/60">
                  <div className="text-[10px] text-indigo-300 flex items-center justify-center gap-0.5">
                    <Percent className="w-3 h-3" /> عمولة (15%)
                  </div>
                  <div className="text-base font-black text-indigo-300 mt-0.5">{commission} ج.م</div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
                  <div className="text-[10px] text-emerald-300 flex items-center justify-center gap-0.5">
                    <Wallet className="w-3 h-3" /> دخل الكابتن (85%)
                  </div>
                  <div className="text-base font-black text-emerald-300 mt-0.5">{netEarned} ج.م</div>
                </div>
              </div>
            </div>

            {/* Customer & Driver Info */}
            <div className="grid grid-cols-1 gap-3">
              {/* Customer */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>بيانات الراكب (العميل)</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{ride.customer_name}</div>
                <div className="text-xs text-slate-600 font-mono flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{ride.customer_phone || 'لا يوجد رقم هاتف'}</span>
                </div>
              </div>

              {/* Driver */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-600" />
                  <span>بيانات الكابتن والمركبة</span>
                </div>
                {ride.driver_name ? (
                  <>
                    <div className="text-sm font-bold text-slate-900">{ride.driver_name}</div>
                    <div className="text-xs text-slate-600 font-mono flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ride.driver_phone || 'لا يوجد رقم هاتف'}</span>
                    </div>
                    {ride.vehicle_info && (
                      <div className="text-xs text-slate-600 mt-1 font-semibold">
                        المركبة: {ride.vehicle_info}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-amber-700 font-bold py-1">
                    لم يتم تعيين كابتن لهذه الرحلة بعد.
                  </div>
                )}
              </div>
            </div>

            {/* Route Addresses */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="text-xs font-bold text-slate-700">مسار التحرك ونقاط الالتقاء</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500 text-[10px]">نقطة الانطلاق</div>
                    <div className="font-bold text-slate-900">{ride.pickup_address_text}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Navigation className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-500 text-[10px]">نقطة الوصول (الوجهة)</div>
                    <div className="font-bold text-slate-900">{ride.dropoff_address_text}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation Reason if cancelled */}
            {ride.status === 'cancelled' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>تفاصيل إلغاء الرحلة</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  السبب: {ride.cancellation_reason || 'تم الإلغاء بدون سبب محدد.'}
                </p>
                {ride.cancelled_at && (
                  <p className="text-[10px] text-rose-500">
                    وقت الإلغاء: {new Date(ride.cancelled_at).toLocaleString('ar-EG')}
                  </p>
                )}
              </div>
            )}

            {/* Ride Status Timeline */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>الجدول الزمني ومراحل الرحلة (Timeline)</span>
              </div>

              {loadingTimeline ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  جارِ تحميل السجل الزمني...
                </div>
              ) : timeline.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  لا توجد سجلات زمنية متاحة.
                </div>
              ) : (
                <div className="relative pr-4 border-r-2 border-slate-200 space-y-3 text-xs mr-2">
                  {timeline.map((evt, idx) => (
                    <div key={`timeline-evt-${idx}`} className="relative group">
                      {/* Marker Bullet */}
                      <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-200"></span>

                      <div className="font-bold text-slate-900">{evt.label}</div>
                      {evt.timestamp && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatSafeTime(evt.timestamp)}{' '}
                          • {formatSafeDate(evt.timestamp)}
                        </div>
                      )}
                      {evt.note && <div className="text-[10px] text-slate-500">{evt.note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
              إغلاق
            </Button>

            {ride.status === 'completed' && ride.payment_status === 'pending_cash_collection' && (
              <Button
                size="sm"
                onClick={() => {
                  onConfirmCashPayment(ride);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <Banknote className="w-4 h-4" />
                تأكيد استلام الكاش ({fare} ج.م)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
