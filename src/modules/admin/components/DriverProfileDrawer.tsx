import React from 'react';
import {
  X,
  User,
  Phone,
  Car,
  Shield,
  Star,
  Clock,
  MapPin,
  Banknote,
  Percent,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Activity,
  Calendar,
} from 'lucide-react';
import { LiveDriver, AdminRide } from '../types';
import { VerificationStatus } from '../../../types/auth';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface DriverProfileDrawerProps {
  driver: LiveDriver | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (driverId: string, status: VerificationStatus) => Promise<void>;
  onViewActiveRide?: (rideId: string) => void;
}

export const DriverProfileDrawer: React.FC<DriverProfileDrawerProps> = ({
  driver,
  isOpen,
  onClose,
  onUpdateStatus,
  onViewActiveRide,
}) => {
  if (!isOpen || !driver) return null;

  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'غير متوفر';
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 45) return 'الآن (منذ لحظات)';
    if (diffSec < 90) return 'منذ دقيقة';
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    return new Date(dateStr).toLocaleDateString('ar-EG');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden dir-rtl">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                {driver.driver_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-black text-white">{driver.driver_name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span>{driver.driver_phone || 'بدون هاتف'}</span>
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

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Live Status & Ratings */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-slate-500 font-bold mb-1">حالة الاتصال والـ GPS:</div>
                {driver.is_stale ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>انقطاع نبض (تحذير)</span>
                  </div>
                ) : driver.active_ride ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                    <span>في رحلة نشطة</span>
                  </div>
                ) : driver.is_online ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>متصل وجاهز</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                    <span>غير متصل</span>
                  </div>
                )}
              </div>

              <div className="text-left">
                <div className="text-[10px] text-slate-500 font-bold mb-1">تقييم الكابتن:</div>
                <div className="inline-flex items-center gap-1 text-sm font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{driver.rating_average || '5.0'}</span>
                </div>
              </div>
            </div>

            {/* Active Ride Banner (if in ride) */}
            {driver.active_ride && (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span>الرحلة الحالية جارية</span>
                  </span>
                  <Badge className="bg-blue-200 text-blue-900">
                    #{driver.active_ride.id.substring(0, 6)}
                  </Badge>
                </div>
                <div className="text-[11px] text-blue-800 space-y-0.5">
                  <p className="truncate">من: {driver.active_ride.pickup_address}</p>
                  <p className="truncate">إلى: {driver.active_ride.dropoff_address}</p>
                </div>
                {onViewActiveRide && (
                  <Button
                    size="sm"
                    onClick={() => onViewActiveRide(driver.active_ride!.id)}
                    className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    فتح تفاصيل الرحلة
                  </Button>
                )}
              </div>
            )}

            {/* Financial Performance */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  حسابات وأرباح اليوم
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {driver.today_rides_count} رحلة اليوم
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-slate-800">
                  <div className="text-[10px] text-slate-400">إجمالي الأجرة</div>
                  <div className="text-sm font-black text-white mt-0.5">{driver.today_gross} ج.م</div>
                </div>
                <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-800/60">
                  <div className="text-[10px] text-indigo-300">عمولة المنصة</div>
                  <div className="text-sm font-black text-indigo-300 mt-0.5">{driver.today_commission} ج.م</div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/60">
                  <div className="text-[10px] text-emerald-300">صافي الكابتن</div>
                  <div className="text-sm font-black text-emerald-300 mt-0.5">{driver.today_net} ج.م</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">إجمالي مستحقات المنصة طرف الكابتن:</span>
                <span className="font-black text-amber-400 text-sm">
                  {driver.total_cash_due_to_platform} ج.م
                </span>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-emerald-600" />
                <span>المركبة المسجلة والمعتمدة</span>
              </div>
              {driver.active_vehicle ? (
                <div className="text-xs space-y-1 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {driver.active_vehicle.make} {driver.active_vehicle.model} ({driver.active_vehicle.year})
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">مركبة نشطة</Badge>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600">
                    رقم اللوحة: <span className="font-bold text-slate-900">{driver.active_vehicle.plate_number}</span>
                  </div>
                  {driver.active_vehicle.color && (
                    <div className="text-[11px] text-slate-500">
                      اللون: {driver.active_vehicle.color}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-2">لا توجد مركبة نشطة مسجلة.</div>
              )}
            </div>

            {/* National ID & License info */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-600" />
                <span>المستندات والرقم القومي</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">الرقم القومي</div>
                  <div className="font-mono font-bold text-slate-900 text-[11px] mt-0.5 truncate">
                    {driver.national_id || 'غير متوفر'}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">رقم الرخصة</div>
                  <div className="font-mono font-bold text-slate-900 text-[11px] mt-0.5 truncate">
                    {driver.license_number || 'غير متوفر'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>آخر نبض GPS: {formatRelativeTime(driver.last_seen)}</span>
              </div>
            </div>
          </div>

          {/* Footer Approval/Suspend Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
              إغلاق
            </Button>

            <div className="flex items-center gap-2">
              {driver.approval_status !== 'approved' && (
                <Button
                  size="sm"
                  onClick={() => onUpdateStatus(driver.id, 'approved')}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                  اعتماد الكابتن
                </Button>
              )}

              {driver.approval_status === 'approved' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatus(driver.id, 'suspended')}
                  className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 font-bold"
                >
                  <Lock className="w-3.5 h-3.5 ml-1" />
                  إيقاف مؤقت
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
