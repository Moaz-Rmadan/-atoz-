import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Clock, Navigation, ShieldCheck, ChevronDown, ChevronUp, Banknote, ArrowRight, Zap } from 'lucide-react';
import { FareBreakdown } from '../../services/fareEngine';

interface FarePreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pickupAddress: string;
  dropoffAddress: string;
  fareBreakdown: FareBreakdown | null;
  onRequestRide: () => void;
  isLoading: boolean;
}

export const FarePreviewSheet: React.FC<FarePreviewSheetProps> = ({
  isOpen,
  onClose,
  pickupAddress,
  dropoffAddress,
  fareBreakdown,
  onRequestRide,
  isLoading,
}) => {
  const [showBreakdownDetails, setShowBreakdownDetails] = useState(false);

  if (!isOpen || !fareBreakdown) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] p-5 z-10 shadow-2xl pb-safe flex flex-col"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <h3 className="text-base font-black text-slate-900">تفاصيل الرحلة والأجرة</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-4 h-4" />
              <span>تسعيرة كفراوي المعتمدة</span>
            </div>
          </div>

          {/* Selected Vehicle Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-4 mb-4 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                <Car className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-base">كفراوي Go</h4>
                  {fareBreakdown.surgeMultiplier > 1 && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-md">
                      <Zap className="w-3 h-3 fill-current" />
                      ذروة {fareBreakdown.surgeMultiplier}x
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    {fareBreakdown.distanceKm.toFixed(1)} كم
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    {Math.round(fareBreakdown.durationMinutes)} دقيقة
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left">
              <div
                className="text-2xl font-black text-emerald-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {fareBreakdown.finalFare.toFixed(2)}
              </div>
              <span className="text-xs font-bold text-slate-400">{fareBreakdown.currency}</span>
            </div>
          </div>

          {/* Route Summary */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 mb-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-xs font-bold text-slate-700 truncate">{pickupAddress}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <p className="text-xs font-bold text-slate-700 truncate">{dropoffAddress}</p>
            </div>
          </div>

          {/* Toggle Fare Breakdown */}
          <button
            onClick={() => setShowBreakdownDetails(!showBreakdownDetails)}
            className="flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 py-1.5 px-2 mb-3 cursor-pointer"
          >
            <span>تفاصيل حساب الأجرة</span>
            {showBreakdownDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showBreakdownDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-2 mb-3"
              >
                <div className="flex justify-between text-slate-600">
                  <span>فتح العداد (الأساسي):</span>
                  <span className="font-bold font-mono">{fareBreakdown.baseFare.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>مسافة القيادة ({fareBreakdown.distanceKm.toFixed(1)} كم):</span>
                  <span className="font-bold font-mono">{fareBreakdown.distanceFare.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>زمن الرحلة ({Math.round(fareBreakdown.durationMinutes)} دقيقة):</span>
                  <span className="font-bold font-mono">{fareBreakdown.timeFare.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>رسوم الخدمة والتأمين:</span>
                  <span className="font-bold font-mono">{fareBreakdown.bookingFee.toFixed(2)} ج.م</span>
                </div>
                {fareBreakdown.surgeMultiplier > 1 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>معدل وقت الذروة:</span>
                    <span className="font-mono">x{fareBreakdown.surgeMultiplier}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                  <span>الإجمالي المطلوب:</span>
                  <span className="text-emerald-700 font-mono">{fareBreakdown.finalFare.toFixed(2)} ج.م</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Payment Method Badge */}
          <div className="flex items-center justify-between p-3 bg-slate-100/70 rounded-2xl mb-4 border border-slate-200/60">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">طريقة الدفع</span>
            </div>
            <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              الدفع نقداً للكابتن (Cash)
            </span>
          </div>

          {/* Sticky CTA */}
          <button
            onClick={onRequestRide}
            disabled={isLoading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري إرسال الطلب...</span>
              </>
            ) : (
              <span>اطلب كابتن كفراوي الآن</span>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
