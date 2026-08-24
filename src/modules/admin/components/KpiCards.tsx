import React from 'react';
import {
  Car,
  Activity,
  Search,
  CheckCircle2,
  Banknote,
  Percent,
  Wallet,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { MobilityAdminStats } from '../types';

interface KpiCardsProps {
  mobility: MobilityAdminStats;
  onCardClick?: (tabKey: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ mobility, onCardClick }) => {
  const m = mobility || {};
  const onlineDrivers = m.onlineDrivers ?? 0;
  const approvedDrivers = m.approvedDrivers ?? 0;
  const activeRides = m.activeRides ?? 0;
  const searchingRides = m.searchingRides ?? 0;
  const completedToday = m.completedToday ?? 0;
  const totalRidesToday = m.totalRidesToday ?? 0;
  const cashCollectedToday = m.cashCollectedToday ?? 0;
  const platformCommissionToday = m.platformCommissionToday ?? 0;
  const driverNetToday = m.driverNetToday ?? 0;
  const pendingCashToday = m.pendingCashToday ?? 0;

  const cards = [
    {
      id: 'online_drivers',
      label: 'كباتن متصلون الآن',
      value: onlineDrivers,
      unit: 'كابتن',
      subtext: `من إجمالي ${approvedDrivers} كابتن معتمد`,
      icon: <Car className="w-5 h-5 text-emerald-600" />,
      bgGradient: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      tabTarget: 'drivers',
    },
    {
      id: 'active_rides',
      label: 'رحلات نشطة جارية',
      value: activeRides,
      unit: 'رحلة',
      subtext: searchingRides > 0 ? `${searchingRides} طلب يبحث عن كابتن` : 'جميع الطلبات معينة',
      icon: <Activity className="w-5 h-5 text-blue-600" />,
      bgGradient: 'bg-blue-50/70 border-blue-200/80 text-blue-950',
      badgeBg: 'bg-blue-100 text-blue-800',
      tabTarget: 'live_ops',
    },
    {
      id: 'searching_rides',
      label: 'طلبات قيد البحث',
      value: searchingRides,
      unit: 'طلب',
      subtext: searchingRides > 0 ? 'تحتاج استجابة سريعة' : 'لا توجد طلبات معلقة',
      icon: <Search className="w-5 h-5 text-amber-600" />,
      bgGradient: 'bg-amber-50/70 border-amber-200/80 text-amber-950',
      badgeBg: 'bg-amber-100 text-amber-800',
      tabTarget: 'rides',
    },
    {
      id: 'completed_today',
      label: 'رحلات مكتملة اليوم',
      value: completedToday,
      unit: 'رحلة',
      subtext: `من إجمالي ${totalRidesToday} طلب اليوم`,
      icon: <CheckCircle2 className="w-5 h-5 text-teal-600" />,
      bgGradient: 'bg-teal-50/70 border-teal-200/80 text-teal-950',
      badgeBg: 'bg-teal-100 text-teal-800',
      tabTarget: 'rides',
    },
    {
      id: 'cash_collected',
      label: 'كاش تم تحصيله اليوم',
      value: cashCollectedToday.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: 'ج.م',
      subtext: 'مبالغ مؤكد استلامها نقداً',
      icon: <Banknote className="w-5 h-5 text-emerald-700" />,
      bgGradient: 'bg-emerald-50/90 border-emerald-300 text-emerald-950',
      badgeBg: 'bg-emerald-200/80 text-emerald-900',
      tabTarget: 'cash_control',
    },
    {
      id: 'platform_commission',
      label: 'عمولة المنصة (15%)',
      value: platformCommissionToday.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: 'ج.م',
      subtext: 'أرباح منظومة كفراوي جو',
      icon: <Percent className="w-5 h-5 text-indigo-600" />,
      bgGradient: 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      tabTarget: 'cash_control',
    },
    {
      id: 'driver_net',
      label: 'صافي دخل الكباتن (85%)',
      value: driverNetToday.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: 'ج.م',
      subtext: 'مستحقات كباتن التوصيل',
      icon: <Wallet className="w-5 h-5 text-cyan-600" />,
      bgGradient: 'bg-cyan-50/70 border-cyan-200/80 text-cyan-950',
      badgeBg: 'bg-cyan-100 text-cyan-800',
      tabTarget: 'cash_control',
    },
    {
      id: 'pending_cash',
      label: 'كاش معلق للتحصيل',
      value: pendingCashToday.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      unit: 'ج.م',
      subtext: pendingCashToday > 0 ? 'بانتظار تأكيد الاستلام' : 'تم تحصيل كل المبالغ',
      icon: <Clock className="w-5 h-5 text-rose-600" />,
      bgGradient: 'bg-rose-50/70 border-rose-200/80 text-rose-950',
      badgeBg: 'bg-rose-100 text-rose-800',
      tabTarget: 'cash_control',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => onCardClick && card.tabTarget && onCardClick(card.tabTarget)}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden ${card.bgGradient}`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-700 leading-tight line-clamp-1">
              {card.label}
            </span>
            <div className="p-2 rounded-xl bg-white/80 shadow-xs border border-white/60 shrink-0">
              {card.icon}
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {card.value}
            </span>
            <span className="text-xs font-bold text-slate-500">{card.unit}</span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-900/5 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span className="truncate">{card.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
