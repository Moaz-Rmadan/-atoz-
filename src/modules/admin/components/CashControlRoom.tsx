import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Percent,
  Wallet,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  ArrowUpDown,
  Download,
  AlertCircle,
  FileSpreadsheet,
  UserCheck,
} from 'lucide-react';
import { CashLedgerEntry, MobilityAdminStats } from '../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface CashControlRoomProps {
  mobilityStats: MobilityAdminStats;
  cashLedger: CashLedgerEntry[];
  onSelectDriverById: (driverId: string) => void;
  onRefresh: () => void;
}

export const CashControlRoom: React.FC<CashControlRoomProps> = ({
  mobilityStats,
  cashLedger,
  onSelectDriverById,
  onRefresh,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'this_week' | 'this_month' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  // Compute total aggregates from ledger
  const aggregates = useMemo(() => {
    let totalCompleted = 0;
    let totalGross = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalCommission = 0;
    let totalDriverNet = 0;
    let totalDue = 0;

    for (const entry of cashLedger) {
      totalCompleted += entry.completed_rides_count;
      totalGross += entry.gross_cash;
      totalCollected += entry.collected_cash;
      totalPending += entry.pending_cash;
      totalCommission += entry.platform_commission;
      totalDriverNet += entry.driver_net;
      totalDue += entry.amount_due_to_platform;
    }

    return {
      totalCompleted,
      totalGross: Math.round(totalGross * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      totalCommission: Math.round(totalCommission * 100) / 100,
      totalDriverNet: Math.round(totalDriverNet * 100) / 100,
      totalDue: Math.round(totalDue * 100) / 100,
    };
  }, [cashLedger]);

  const filteredLedger = useMemo(() => {
    return cashLedger
      .filter((entry) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          entry.driver_name.toLowerCase().includes(q) ||
          entry.driver_phone?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        return sortAsc
          ? a.amount_due_to_platform - b.amount_due_to_platform
          : b.amount_due_to_platform - a.amount_due_to_platform;
      });
  }, [cashLedger, searchQuery, sortAsc]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Banknote className="w-6 h-6 text-emerald-400" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                غرفة الرقابة والتحصيل المالي (Cash Control Room)
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              مراقبة التدفقات النقدية، عمولة المنصة (15%)، صافي دخل الكباتن (85%)، وتتبع المبالغ المستحقة طرف الكباتن.
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setSelectedPeriod('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedPeriod === 'today'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setSelectedPeriod('this_week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedPeriod === 'this_week'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              onClick={() => setSelectedPeriod('this_month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedPeriod === 'this_month'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                selectedPeriod === 'all'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Cash Collected Today/Period */}
        <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-bold text-slate-700">كاش تم تحصيله مؤكداً</span>
            <div className="p-2 rounded-xl bg-white shadow-xs border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {selectedPeriod === 'today'
              ? mobilityStats.cashCollectedToday
              : aggregates.totalCollected}{' '}
            <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            حالة الدفع: paid_cash
          </div>
        </div>

        {/* Pending Cash Collection */}
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-bold text-slate-700">كاش معلق للتحصيل</span>
            <div className="p-2 rounded-xl bg-white shadow-xs border border-amber-200">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {selectedPeriod === 'today'
              ? mobilityStats.pendingCashToday
              : aggregates.totalPending}{' '}
            <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            بانتظار تأكيد الاستلام من الكابتن
          </div>
        </div>

        {/* Platform Commission (15%) */}
        <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-300 text-indigo-950 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-bold text-slate-700">عمولة المنصة (15%)</span>
            <div className="p-2 rounded-xl bg-white shadow-xs border border-indigo-200">
              <Percent className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {selectedPeriod === 'today'
              ? mobilityStats.platformCommissionToday
              : aggregates.totalCommission}{' '}
            <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            حصة كفراوي جو المعتمدة
          </div>
        </div>

        {/* Driver Net (85%) */}
        <div className="p-4 rounded-2xl bg-cyan-50/90 border border-cyan-300 text-cyan-950 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-bold text-slate-700">صافي دخل الكباتن (85%)</span>
            <div className="p-2 rounded-xl bg-white shadow-xs border border-cyan-200">
              <Wallet className="w-5 h-5 text-cyan-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {selectedPeriod === 'today'
              ? mobilityStats.driverNetToday
              : aggregates.totalDriverNet}{' '}
            <span className="text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            مستحقات الكباتن المحققة
          </div>
        </div>
      </div>

      {/* Driver Cash Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>دفتر حسابات الكباتن والعمولات (Driver Cash Ledger)</span>
              <Badge className="bg-slate-100 text-slate-700">
                {filteredLedger.length} كابتن
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              توزيع المبالغ النقدية المحصلة ومستحقات المنصة (15%) لكل كابتن مسجل.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث باسم الكابتن أو الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">الكابتن</th>
                <th className="py-3 px-4 text-center">الرحلات المكتملة</th>
                <th className="py-3 px-4">إجمالي الكاش المحصل</th>
                <th className="py-3 px-4">كاش مؤكد التحصيل</th>
                <th className="py-3 px-4">كاش معلق</th>
                <th className="py-3 px-4">عمولة المنصة (15%)</th>
                <th className="py-3 px-4">صافي دخل الكابتن (85%)</th>
                <th
                  onClick={() => setSortAsc(!sortAsc)}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>مستحقات المنصة طرف الكابتن</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    لا توجد بيانات حسابات مسجلة حالياً.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((row) => (
                  <tr
                    key={`ledger-row-${row.driver_id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Driver Name & Phone */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{row.driver_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {row.driver_phone || 'بدون هاتف'}
                      </div>
                    </td>

                    {/* Rides count */}
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {row.completed_rides_count}
                    </td>

                    {/* Gross */}
                    <td className="py-3 px-4 font-black text-slate-900">
                      {row.gross_cash} ج.م
                    </td>

                    {/* Collected */}
                    <td className="py-3 px-4 text-emerald-700 font-semibold">
                      {row.collected_cash} ج.م
                    </td>

                    {/* Pending */}
                    <td className="py-3 px-4 text-amber-700 font-semibold">
                      {row.pending_cash} ج.م
                    </td>

                    {/* 15% Platform Commission */}
                    <td className="py-3 px-4 text-indigo-700 font-bold">
                      {row.platform_commission} ج.م
                    </td>

                    {/* 85% Driver Net */}
                    <td className="py-3 px-4 text-cyan-800 font-bold">
                      {row.driver_net} ج.م
                    </td>

                    {/* Total amount due to platform */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block font-black px-2 py-0.5 rounded-lg text-xs ${
                          row.amount_due_to_platform > 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.amount_due_to_platform} ج.م
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectDriverById(row.driver_id)}
                        className="h-7 px-2.5 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        <UserCheck className="w-3.5 h-3.5 ml-1 text-slate-500" />
                        الملف
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
