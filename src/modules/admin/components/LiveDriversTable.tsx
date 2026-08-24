import React, { useState, useMemo } from 'react';
import {
  Car,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Eye,
  Shield,
  Phone,
  Wallet,
  ArrowUpDown,
} from 'lucide-react';
import { LiveDriver } from '../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface LiveDriversTableProps {
  drivers: LiveDriver[];
  onSelectDriver: (driver: LiveDriver) => void;
  onOpenApprovalQueue?: () => void;
}

export const LiveDriversTable: React.FC<LiveDriversTableProps> = ({
  drivers,
  onSelectDriver,
  onOpenApprovalQueue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'busy' | 'stale' | 'offline' | 'pending' | 'suspended'>('all');
  const [sortField, setSortField] = useState<'name' | 'last_seen' | 'rides' | 'due'>('last_seen');
  const [sortAsc, setSortAsc] = useState(false);

  // Format relative time
  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'غير متوفر';
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 45) return 'الآن (منذ لحظات)';
    if (diffSec < 90) return 'منذ دقيقة';
    if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
    return new Date(dateStr).toLocaleDateString('ar-EG');
  };

  const filteredDrivers = useMemo(() => {
    return drivers
      .filter((d) => {
        // Status filter
        if (statusFilter === 'online' && (!d.is_online || d.is_stale || d.active_ride)) return false;
        if (statusFilter === 'busy' && !d.active_ride) return false;
        if (statusFilter === 'stale' && !d.is_stale) return false;
        if (statusFilter === 'offline' && d.is_online) return false;
        if (statusFilter === 'pending' && d.approval_status !== 'pending') return false;
        if (statusFilter === 'suspended' && d.approval_status !== 'suspended') return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = d.driver_name.toLowerCase().includes(q);
          const matchPhone = d.driver_phone?.toLowerCase().includes(q);
          const matchPlate = d.active_vehicle?.plate_number.toLowerCase().includes(q);
          const matchLicense = d.license_number.toLowerCase().includes(q);
          const matchNational = d.national_id.toLowerCase().includes(q);
          return matchName || matchPhone || matchPlate || matchLicense || matchNational;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortAsc
            ? a.driver_name.localeCompare(b.driver_name)
            : b.driver_name.localeCompare(a.driver_name);
        }
        if (sortField === 'last_seen') {
          const tA = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const tB = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          return sortAsc ? tA - tB : tB - tA;
        }
        if (sortField === 'rides') {
          return sortAsc ? a.today_rides_count - b.today_rides_count : b.today_rides_count - a.today_rides_count;
        }
        if (sortField === 'due') {
          return sortAsc
            ? a.total_cash_due_to_platform - b.total_cash_due_to_platform
            : b.total_cash_due_to_platform - a.total_cash_due_to_platform;
        }
        return 0;
      });
  }, [drivers, statusFilter, searchQuery, sortField, sortAsc]);

  const toggleSort = (field: 'name' | 'last_seen' | 'rides' | 'due') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900">
              مراقبة الكباتن الحية (Live Drivers Monitor)
            </h2>
            <Badge className="bg-slate-100 text-slate-700">
              {filteredDrivers.length} كابتن
            </Badge>
          </div>

          {onOpenApprovalQueue && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenApprovalQueue}
              className="text-xs h-8 bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
            >
              <Shield className="w-3.5 h-3.5 ml-1" />
              قائمة اعتماد ومراجعة الكباتن
            </Button>
          )}
        </div>

        {/* Search & Filter Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالاسم، رقم الهاتف، رقم اللوحة، الرقم القومي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({drivers.length})
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'online'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🟢 متاح ({drivers.filter((d) => d.is_online && !d.active_ride && !d.is_stale).length})
            </button>
            <button
              onClick={() => setStatusFilter('busy')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'busy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              🔵 في رحلة ({drivers.filter((d) => d.active_ride).length})
            </button>
            <button
              onClick={() => setStatusFilter('stale')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'stale'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              🟠 انقطاع نبض ({drivers.filter((d) => d.is_stale).length})
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'offline'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              غير متصل ({drivers.filter((d) => !d.is_online).length})
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>الكابتن</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">المركبة الحالية</th>
                <th className="py-3 px-4">حالة الاعتماد</th>
                <th className="py-3 px-4">الحالة المباشرة</th>
                <th
                  onClick={() => toggleSort('last_seen')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>آخر نبض GPS</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('rides')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>رحلات ودخل اليوم</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('due')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>عمولة مستحقة للمنصة</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    لا يوجد كباتن يطابقون معايير البحث المحددة.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr
                    key={`driver-row-${driver.id}`}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Driver info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs">
                          {driver.driver_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{driver.driver_name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{driver.driver_phone || 'بدون هاتف'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3 px-4">
                      {driver.active_vehicle ? (
                        <div>
                          <div className="font-semibold text-slate-900">
                            {driver.active_vehicle.make} {driver.active_vehicle.model}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            لوحة: {driver.active_vehicle.plate_number}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">بدون مركبة</span>
                      )}
                    </td>

                    {/* Approval Status */}
                    <td className="py-3 px-4">
                      {driver.approval_status === 'approved' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          معتمد
                        </Badge>
                      ) : driver.approval_status === 'pending' ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          قيد المراجعة
                        </Badge>
                      ) : driver.approval_status === 'suspended' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300">
                          موقوف
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700">مرفوض</Badge>
                      )}
                    </td>

                    {/* Live Online / Busy / Stale status */}
                    <td className="py-3 px-4">
                      {driver.is_stale ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>انقطاع نبض</span>
                        </div>
                      ) : driver.active_ride ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                          <span>في رحلة</span>
                        </div>
                      ) : driver.is_online ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>متصل وجاهز</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          <span>غير متصل</span>
                        </div>
                      )}
                    </td>

                    {/* Last Seen GPS */}
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatRelativeTime(driver.last_seen)}</span>
                      </div>
                      {driver.last_latitude && driver.last_longitude && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                          <span>
                            {driver.last_latitude.toFixed(3)}, {driver.last_longitude.toFixed(3)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Today's performance */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {driver.today_gross} ج.م
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {driver.today_rides_count} رحلة • صافي {driver.today_net} ج.م
                      </div>
                    </td>

                    {/* Cash due */}
                    <td className="py-3 px-4">
                      <span className={`font-bold ${driver.total_cash_due_to_platform > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                        {driver.total_cash_due_to_platform} ج.م
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectDriver(driver)}
                        className="h-7 px-2.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5 ml-1 text-slate-500" />
                        عرض الملف
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
