import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Shield,
  FileText,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { mobilityApi, Ride } from '../../services/mobilityApi';

interface DriverEarningsViewProps {
  driverId: string;
  onBack: () => void;
}

export const DriverEarningsView: React.FC<DriverEarningsViewProps> = ({ driverId, onBack }) => {
  const [period, setPeriod] = useState<'today' | 'thisWeek' | 'thisMonth' | 'all'>('today');
  const [financialData, setFinancialData] = useState<{
    today: { gross: number; commission: number; net: number; count: number };
    thisWeek: { gross: number; commission: number; net: number; count: number };
    thisMonth: { gross: number; commission: number; net: number; count: number };
    totalCashOwed: number;
    totalCashCollected: number;
    totalNetEarned: number;
    completedRides: Ride[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEarnings = async () => {
    setIsLoading(true);
    try {
      const data = await mobilityApi.getDriverFinancialSummary(driverId);
      setFinancialData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [driverId]);

  const currentStats = financialData
    ? period === 'today'
      ? financialData.today
      : period === 'thisWeek'
      ? financialData.thisWeek
      : period === 'thisMonth'
      ? financialData.thisMonth
      : {
          gross: financialData.totalCashCollected,
          commission: financialData.totalCashOwed,
          net: financialData.totalNetEarned,
          count: financialData.completedRides.length,
        }
    : { gross: 0, commission: 0, net: 0, count: 0 };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-5 dir-rtl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">أرباحي والمالية</h3>
            <p className="text-[11px] text-slate-400 font-medium">سجل الدخل والتحصيل النقدي المعتمد</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchEarnings}
            disabled={isLoading}
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span>عودة</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold text-slate-600">
        <button
          onClick={() => setPeriod('today')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            period === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          اليوم
        </button>
        <button
          onClick={() => setPeriod('thisWeek')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            period === 'thisWeek' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          هذا الأسبوع
        </button>
        <button
          onClick={() => setPeriod('thisMonth')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            period === 'thisMonth' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          هذا الشهر
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
            period === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
          }`}
        >
          الإجمالي
        </button>
      </div>

      {/* Main Net Income Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-slate-400">
            صافي دخل الكابتن ({period === 'today' ? 'اليوم' : period === 'thisWeek' ? 'الأسبوع' : period === 'thisMonth' ? 'الشهر' : 'الكلي'})
          </span>
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-full border border-emerald-500/30">
            {currentStats.count} رحلة مكتملة
          </span>
        </div>

        <div
          className="text-3xl font-black text-emerald-400 mb-4"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {currentStats.net} <span className="text-sm font-ibm-plex text-white">ج.م</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">إجمالي الكاش المحصل</span>
            <span className="font-bold text-slate-200 font-mono">{currentStats.gross} ج.م</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">عمولة المنصة (15%)</span>
            <span className="font-bold text-rose-400 font-mono">{currentStats.commission} ج.م</span>
          </div>
        </div>
      </div>

      {/* Platform Debt & Cash Balance Warning Notice */}
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs">
        <div className="flex items-center gap-2 text-amber-900 font-black mb-1.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>رصيد الكاش المستحق للمنصة</span>
        </div>
        <p className="text-slate-600 font-medium leading-relaxed mb-3">
          يتم تحصيل كامل قيمة الرحلات نقداً باليد من الركاب مباشرة. عمولة المنصة المستحقة بذمتك هي:
        </p>

        <div className="bg-white rounded-xl p-3 border border-amber-200 flex justify-between items-center font-bold">
          <span className="text-slate-700">المبلغ المستحق للمنصة:</span>
          <span
            className="text-rose-600 text-base font-black"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {financialData?.totalCashOwed || 0} ج.م
          </span>
        </div>
      </div>

      {/* Ride-by-ride breakdown */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-slate-500" />
          <span>تفاصيل الرحلات المكتملة وحساباتها</span>
        </h4>

        {isLoading ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">جاري جلب السجلات المالية...</div>
        ) : !financialData?.completedRides.length ? (
          <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400 font-medium">
            لا توجد رحلات مكتملة في هذا السجل حتى الآن.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {financialData.completedRides.map((ride) => {
              const total = ride.customer_total || ride.final_fare || ride.estimated_fare || 0;
              const comm =
                ride.platform_commission !== undefined && ride.platform_commission !== null
                  ? ride.platform_commission
                  : Math.round(total * 0.15 * 100) / 100;
              const net =
                ride.driver_earning !== undefined && ride.driver_earning !== null
                  ? ride.driver_earning
                  : Math.round((total - comm) * 100) / 100;

              return (
                <div
                  key={ride.id}
                  className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">
                      {ride.pickup_address_text} → {ride.dropoff_address_text}
                    </span>
                    <span className="font-black text-emerald-700 font-mono text-sm">+{net} ج.م</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-200/60 pt-1">
                    <span>
                      الكاش: <b className="font-mono text-slate-700">{total}ج</b> | العمولة: <b className="font-mono text-rose-600">-{comm}ج</b>
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      {ride.payment_status === 'paid_cash' || ride.payment_status === 'completed' ? 'تم الاستلام' : 'محصل نقداً'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
