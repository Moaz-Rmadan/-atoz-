import React, { useState } from 'react';
import {
  Activity,
  Car,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { LiveDriver, AdminRide, OperationsAlert } from '../types';
import { AdminLiveOperationsMap } from './AdminLiveOperationsMap';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface LiveOperationsRoomProps {
  drivers: LiveDriver[];
  rides: AdminRide[];
  alerts: OperationsAlert[];
  onSelectDriver: (driver: LiveDriver) => void;
  onSelectRide: (ride: AdminRide) => void;
  onNavigateTab: (tab: string) => void;
}

export const LiveOperationsRoom: React.FC<LiveOperationsRoomProps> = ({
  drivers,
  rides,
  alerts,
  onSelectDriver,
  onSelectRide,
  onNavigateTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'map' | 'quick_feed'>('map');

  const activeRides = rides.filter((r) =>
    ['requested', 'driver_assigned', 'arrived', 'in_transit'].includes(r.status)
  );
  const onlineDrivers = drivers.filter((d) => d.is_online);
  const staleDrivers = drivers.filter((d) => d.is_stale);

  return (
    <div className="space-y-4">
      {/* Top Banner / Operation Status Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                غرفة العمليات والتوجيه اللحظي (Live Dispatch Room)
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              مراقبة حركة الكباتن في كفر البطيخ ودمياط، متابعة مسارات الرحلات الحية لحظة بلحظة، ورصد أي انقطاع في نبض الـ GPS.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-slate-400">كباتن متصلين</div>
              <div className="text-base font-black text-emerald-400">{onlineDrivers.length}</div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-slate-400">رحلات نشطة</div>
              <div className="text-base font-black text-blue-400">{activeRides.length}</div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-center min-w-[90px]">
              <div className="text-[10px] font-bold text-slate-400">تنبيهات حرجة</div>
              <div className={`text-base font-black ${alerts.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {alerts.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Live Map */}
      <AdminLiveOperationsMap
        drivers={drivers}
        rides={rides}
        onSelectDriver={onSelectDriver}
        onSelectRide={onSelectRide}
      />

      {/* Realtime Live Feeds Grid below Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Rides Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                الرحلات الجارية الآن ({activeRides.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('rides')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              عرض جدول الرحلات
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          {activeRides.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              لا توجد رحلات جارية في هذه اللحظة.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {activeRides.map((r) => (
                <div
                  key={`feed-ride-${r.id}`}
                  onClick={() => onSelectRide(r)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/70 hover:bg-blue-50/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      طلب #{r.id.substring(0, 6)} • {r.customer_name}
                    </span>
                    <Badge
                      className={
                        r.status === 'requested'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : r.status === 'in_transit'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }
                    >
                      {r.status === 'requested'
                        ? 'يبحث عن كابتن'
                        : r.status === 'driver_assigned'
                        ? 'تم تعيين كابتن'
                        : r.status === 'arrived'
                        ? 'الكابتن وصل'
                        : 'في الطريق'}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-2 mt-1">
                    <div className="truncate">
                      <span className="font-semibold text-slate-500">من: </span>
                      {r.pickup_address_text}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-slate-500">إلى: </span>
                      {r.dropoff_address_text}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-slate-200/60 font-medium">
                    <span>الكابتن: {r.driver_name || 'بانتظار القبول'}</span>
                    <span className="font-bold text-slate-900">
                      {r.final_fare || r.estimated_fare || r.customer_total} ج.م نقداً
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Drivers Status Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                حالة الكباتن المتصلين ({onlineDrivers.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('drivers')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
            >
              مراقبة السائقين
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          {onlineDrivers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              لا يوجد كباتن متصلون حالياً.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {onlineDrivers.map((d) => (
                <div
                  key={`feed-driver-${d.id}`}
                  onClick={() => onSelectDriver(d)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50/70 hover:bg-emerald-50/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {d.driver_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {d.driver_name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {d.active_vehicle?.make} {d.active_vehicle?.model} • ({d.active_vehicle?.plate_number})
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block ${
                        d.is_stale
                          ? 'bg-amber-100 text-amber-800'
                          : d.active_ride
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {d.is_stale ? 'انقطاع نبض' : d.active_ride ? 'في رحلة' : 'متاح وجاهز'}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      رحلات اليوم: {d.today_rides_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
