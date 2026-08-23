import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Edit3, X } from 'lucide-react';

interface GpsPermissionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestGps: () => void;
  onManualInput: () => void;
  isLoading: boolean;
}

export const GpsPermissionSheet: React.FC<GpsPermissionSheetProps> = ({
  isOpen,
  onClose,
  onRequestGps,
  onManualInput,
  isLoading,
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
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] p-6 z-10 shadow-2xl pb-safe flex flex-col items-center text-center"
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 shrink-0" />

          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4 border border-blue-100 shadow-inner">
            <Navigation className="w-8 h-8 rotate-45" />
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-2">تحديد موقعك الحالي</h3>
          <p className="text-xs text-slate-500 font-medium max-w-xs mb-6 leading-relaxed">
            نحتاج الوصول إلى موقعك الجغرافي لنحدد نقطة انطلاقك تلقائياً ونوفر لك أقرب كابتن متاح في كفر الشيخ.
          </p>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={onRequestGps}
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري تحديد موقعك...</span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>السماح بتحديد الموقع الجغرافي</span>
                </>
              )}
            </button>

            <button
              onClick={onManualInput}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>إدخال الموقع يدويًا</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
