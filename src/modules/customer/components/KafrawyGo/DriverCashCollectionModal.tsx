import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Banknote, CheckCircle2, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { Ride } from '../../services/mobilityApi';

interface DriverCashCollectionModalProps {
  ride: Ride | null;
  isOpen: boolean;
  onConfirmCashReceived: (rideId: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const DriverCashCollectionModal: React.FC<DriverCashCollectionModalProps> = ({
  ride,
  isOpen,
  onConfirmCashReceived,
  onClose,
  isLoading = false,
}) => {
  const [isConfirmedSuccess, setIsConfirmedSuccess] = useState(false);

  if (!isOpen || !ride) return null;

  const totalFare = ride.customer_total || ride.final_fare || ride.estimated_fare || 0;
  const platformCommission =
    ride.platform_commission !== undefined && ride.platform_commission !== null
      ? ride.platform_commission
      : Math.round(totalFare * 0.15 * 100) / 100;
  const driverNet =
    ride.driver_earning !== undefined && ride.driver_earning !== null
      ? ride.driver_earning
      : Math.round((totalFare - platformCommission) * 100) / 100;

  const isAlreadyPaid =
    ride.payment_status === 'paid_cash' ||
    ride.payment_status === 'completed' ||
    isConfirmedSuccess;

  const handleConfirm = async () => {
    try {
      await onConfirmCashReceived(ride.id);
      setIsConfirmedSuccess(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs"
        />

        {/* Modal Sheet Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 z-10 shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Banknote className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              {isAlreadyPaid ? 'تم تأكيد استلام الأجرة نقداً' : 'تحصيل الأجرة النقدية'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isAlreadyPaid
                ? 'تم تسجيل المعاملة في النظام وحفظ رصيد الرحلة.'
                : 'وصلت الرحلة لنهايتها. يرجى استلام المبلغ نقداً من العميل مباشرة.'}
            </p>
          </div>

          {/* Amount to collect card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 mb-4 text-center shadow-lg relative overflow-hidden">
            <div className="text-xs font-bold text-slate-400 mb-1">المبلغ المطلوب تحصيله كاش باليد</div>
            <div
              className="text-3xl font-black text-emerald-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {totalFare} <span className="text-sm font-ibm-plex text-white">ج.م</span>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-bold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>الدفع نقداً فقط (Cash Only)</span>
            </div>
          </div>

          {/* Server-Side FinTech Split Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-5 space-y-2.5">
            <div className="text-xs font-black text-slate-700 mb-1 border-b border-slate-200 pb-1.5">
              تفاصيل المحاسبة المالية المعتمدة:
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">إجمالي قيمة الرحلة:</span>
              <span className="font-bold text-slate-800">{totalFare} ج.م</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">عمولة المنصة (15% مستحقة):</span>
              <span className="font-bold text-rose-600 font-mono">-{platformCommission} ج.م</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="font-black text-slate-900">صافي دخل الكابتن:</span>
              <span className="font-black text-emerald-700 font-mono text-base">+{driverNet} ج.م</span>
            </div>
          </div>

          {/* Action Area */}
          {!isAlreadyPaid ? (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري تسجيل الدفع...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تأكيد استلام {totalFare} ج.م كاش</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400 font-medium">
                تأكيد الاستلام يسجل العملية في خوادم كفراوي Go ويحدث رصيد أرباحك فوراً.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم تسجيل تحصيل المبلغ نقداً بنجاح في سجل حسابك.</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                العودة للوحة الكابتن واستقبال رحلات جديدة
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
