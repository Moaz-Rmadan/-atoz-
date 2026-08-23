import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, XCircle, ShieldCheck } from 'lucide-react';

interface SearchingCaptainSheetProps {
  isOpen: boolean;
  onCancel: () => void;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare?: number | null;
}

export const SearchingCaptainSheet: React.FC<SearchingCaptainSheetProps> = ({
  isOpen,
  onCancel,
  pickupAddress,
  dropoffAddress,
  estimatedFare,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Bottom Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 z-10 shadow-2xl pb-safe flex flex-col items-center text-center"
        >
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />

          {/* Radar Animation */}
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-emerald-500/30 rounded-full animate-pulse" />
            <div className="relative w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl border-2 border-emerald-400">
              <Car className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-1">جاري البحث عن كابتن...</h3>
          <p className="text-xs text-slate-500 font-medium max-w-xs mb-6 leading-relaxed">
            نقوم بالتواصل مع أقرب كباتن كفراوي المعتمدين في محيطك لتأكيد رحلتك فوراً.
          </p>

          {/* Quick Info Box */}
          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 mb-6 text-right space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">نقطة الانطلاق:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{pickupAddress}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">الوجهة:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{dropoffAddress}</span>
            </div>
            {estimatedFare && (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">الأجرة المقدرة:</span>
                <span className="font-black text-emerald-700 font-mono">{estimatedFare} ج.م</span>
              </div>
            )}
          </div>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm rounded-2xl transition-all border border-rose-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>إلغاء طلب البحث</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
