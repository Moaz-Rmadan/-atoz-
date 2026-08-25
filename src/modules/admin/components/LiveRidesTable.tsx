import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  CheckCircle2,
  Clock,
  Banknote,
  AlertCircle,
  Eye,
  MapPin,
  Navigation,
  ArrowUpDown,
  Car,
  DollarSign,
} from 'lucide-react';
import { AdminRide } from '../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatSafeTime, formatSafeDate } from '../utils/dateUtils';

interface LiveRidesTableProps {
  rides: AdminRide[];
  onSelectRide: (ride: AdminRide) => void;
  onConfirmCashPayment: (ride: AdminRide) => void;
}

export const LiveRidesTable: React.FC<LiveRidesTableProps> = ({
  rides,
  onSelectRide,
  onConfirmCashPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'requested' | 'driver_assigned' | 'arrived' | 'in_transit' | 'completed' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending_cash_collection' | 'paid_cash'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredRides = useMemo(() => {
    return rides.filter((r) => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Payment filter
      if (paymentFilter === 'pending_cash_collection' && r.payment_status !== 'pending_cash_collection' && r.payment_status !== 'pending') return false;
      if (paymentFilter === 'paid_cash' && r.payment_status !== 'paid_cash' && r.payment_status !== 'completed') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = r.id.toLowerCase().includes(q);
        const matchCustomer = r.customer_name?.toLowerCase().includes(q);
        const matchPhone = r.customer_phone?.toLowerCase().includes(q);
        const matchDriver = r.driver_name?.toLowerCase().includes(q);
        const matchPickup = r.pickup_address_text.toLowerCase().includes(q);
        const matchDropoff = r.dropoff_address_text.toLowerCase().includes(q);
        return matchId || matchCustomer || matchPhone || matchDriver || matchPickup || matchDropoff;
      }
      return true;
    });
  }, [rides, statusFilter, paymentFilter, searchQuery]);

  const totalPages = Math.ceil(filteredRides.length / itemsPerPage) || 1;
  const paginatedRides = filteredRides.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-1"></span>
            قيد البحث
          </Badge>
        );
      case 'driver_assigned':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            تم تعيين كابتن
          </Badge>
        );
      case 'arrived':
        return (
          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">
            وصل الكابتن
          </Badge>
        );
      case 'in_transit':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping ml-1"></span>
            في الطريق
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
            مكتملة
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300">
            ملغاة
          </Badge>
        );
      default:
        return <Badge className="bg-slate-100 text-slate-700">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid_cash':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            تم التحصيل نقداً
          </span>
        );
      case 'pending_cash_collection':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            كاش معلق للتحصيل
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
            بانتظار الاكتمال
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-black text-slate-900">
              سجل ومراقبة الرحلات الحية (Live Rides Log)
            </h2>
            <Badge className="bg-slate-100 text-slate-700">
              {filteredRides.length} رحلة
            </Badge>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث برقم الرحلة، اسم العميل، الكابتن، نقطة الانطلاق، الوجهة..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع الحالات ({rides.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('requested');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'requested'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              قيد البحث ({rides.filter((r) => r.status === 'requested').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('driver_assigned');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'driver_assigned'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              تم التعيين ({rides.filter((r) => r.status === 'driver_assigned').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('arrived');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'arrived'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
              }`}
            >
              الكابتن وصل ({rides.filter((r) => r.status === 'arrived').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('in_transit');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'in_transit'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              في الطريق ({rides.filter((r) => r.status === 'in_transit').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('completed');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              مكتملة ({rides.filter((r) => r.status === 'completed').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('cancelled');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              ملغاة ({rides.filter((r) => r.status === 'cancelled').length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الرحلة والتاريخ</th>
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">الكابتن والمركبة</th>
                <th className="py-3 px-4">مسار الرحلة (الانطلاق ➔ الوجهة)</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">الأجرة والتوزيع (15% / 85%)</th>
                <th className="py-3 px-4">حالة التحصيل</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRides.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    لا توجد رحلات تطابق البحث الحالي.
                  </td>
                </tr>
              ) : (
                paginatedRides.map((ride) => {
                  const fare = ride.customer_total || ride.final_fare || ride.estimated_fare || 0;
                  const comm = ride.platform_commission || Math.round(fare * 0.15 * 100) / 100;
                  const net = ride.driver_earning || Math.round((fare - comm) * 100) / 100;

                  return (
                    <tr
                      key={`ride-row-${ride.id}`}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* ID & Timestamp */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          #{ride.id.substring(0, 8)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatSafeTime(ride.created_at)}
                          {' • '}
                          {formatSafeDate(ride.created_at)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ride.customer_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ride.customer_phone || 'بدون هاتف'}
                        </div>
                      </td>

                      {/* Driver & Vehicle */}
                      <td className="py-3 px-4">
                        {ride.driver_name ? (
                          <div>
                            <div className="font-bold text-slate-900">{ride.driver_name}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                              {ride.vehicle_info || 'مركبة معتمدة'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                            بانتظار كابتن
                          </span>
                        )}
                      </td>

                      {/* Route Path */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="text-slate-700 truncate flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{ride.pickup_address_text}</span>
                        </div>
                        <div className="text-slate-500 truncate flex items-center gap-1 text-[11px] mt-0.5">
                          <Navigation className="w-3 h-3 text-rose-600 shrink-0" />
                          <span className="truncate">{ride.dropoff_address_text}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(ride.status)}</td>

                      {/* Financials Split */}
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900">{fare} ج.م نقداً</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="text-indigo-600 font-semibold">منصة: {comm} ج.م</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold">كابتن: {net} ج.م</span>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4">{getPaymentStatusBadge(ride.payment_status)}</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectRide(ride)}
                            className="h-7 px-2 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700"
                            title="عرض تفاصيل الرحلة والجدول الزمني"
                          >
                            <Eye className="w-3.5 h-3.5 ml-1" />
                            تفاصيل
                          </Button>

                          {/* Quick Cash collection action button */}
                          {ride.status === 'completed' &&
                            ride.payment_status === 'pending_cash_collection' && (
                              <Button
                                size="sm"
                                onClick={() => onConfirmCashPayment(ride)}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                                title="تأكيد استلام المبلغ نقداً"
                              >
                                <Banknote className="w-3.5 h-3.5 ml-1" />
                                تحصيل
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              صفحة {currentPage} من {totalPages} (إجمالي {filteredRides.length} رحلة)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-7 text-xs"
              >
                السابق
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-7 text-xs"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
