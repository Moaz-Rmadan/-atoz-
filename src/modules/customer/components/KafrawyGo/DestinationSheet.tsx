import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Building, Briefcase, GraduationCap, Home, Clock, X, Navigation, AlertCircle } from 'lucide-react';

interface DestinationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pickupText: string;
  setPickupText: (val: string) => void;
  dropoffText: string;
  setDropoffText: (val: string) => void;
  onConfirmLocations: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

const POPULAR_LOCATIONS = [
  {
    id: 'kfs_uni',
    title: 'جامعة كفر الشيخ',
    desc: 'شارع الجيش، حي سخا، كفر الشيخ',
    icon: GraduationCap,
  },
  {
    id: 'kfs_insha',
    title: 'مزلقان الانشاء والتعمير',
    desc: 'شارع الخليفة المأمون، كفر الشيخ',
    icon: MapPin,
  },
  {
    id: 'kfs_hosp',
    title: 'مستشفى كفر الشيخ العام',
    desc: 'طريق المحلة، كفر الشيخ',
    icon: Building,
  },
  {
    id: 'kfs_cityclub',
    title: 'سيتي كلوب كفر الشيخ',
    desc: 'امتداد طريق استاد كفر الشيخ',
    icon: MapPin,
  },
  {
    id: 'kfs_dawaran47',
    title: 'دوران 47',
    desc: 'تقسيم المحافظة، كفر الشيخ',
    icon: Navigation,
  },
  {
    id: 'kfs_court',
    title: 'مجمع المحاكم ومجلس الدولة',
    desc: 'أمام ديوان عام المحافظة',
    icon: Briefcase,
  },
];

export const DestinationSheet: React.FC<DestinationSheetProps> = ({
  isOpen,
  onClose,
  pickupText,
  setPickupText,
  dropoffText,
  setDropoffText,
  onConfirmLocations,
  isLoading,
  errorMessage,
}) => {
  const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff'>('dropoff');

  if (!isOpen) return null;

  const handleSelectLocation = (locTitle: string) => {
    if (activeInput === 'pickup') {
      setPickupText(locTitle);
      setActiveInput('dropoff');
    } else {
      setDropoffText(locTitle);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] p-5 z-10 shadow-2xl h-[85vh] flex flex-col pb-safe"
        >
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-lg font-black text-slate-900">تحديد مسار الرحلة</h3>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dual Inputs */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 mb-4 shrink-0">
            <div className="relative flex flex-col gap-2.5">
              {/* Vertical connecting line */}
              <div className="absolute right-4 top-[22px] bottom-[22px] w-0.5 bg-slate-200" />

              {/* Pickup Input */}
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="نقطة الركوب (موقعك الحالي)..."
                    value={pickupText}
                    onFocus={() => setActiveInput('pickup')}
                    onChange={(e) => setPickupText(e.target.value)}
                    className={`w-full bg-white border ${
                      activeInput === 'pickup' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                    } rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all`}
                  />
                  {pickupText && (
                    <button
                      onClick={() => setPickupText('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dropoff Input */}
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-100 shrink-0" />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="إلى أين تريد الذهاب؟ (الوجهة)..."
                    value={dropoffText}
                    autoFocus
                    onFocus={() => setActiveInput('dropoff')}
                    onChange={(e) => setDropoffText(e.target.value)}
                    className={`w-full bg-white border ${
                      activeInput === 'dropoff' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200'
                    } rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all`}
                  />
                  {dropoffText && (
                    <button
                      onClick={() => setDropoffText('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 mb-3 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Locations / Suggestions */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 no-scrollbar">
            <h4 className="text-xs font-bold text-slate-400 px-1 mb-2">أماكن مقترحة في كفر الشيخ</h4>
            {POPULAR_LOCATIONS.map((loc) => {
              const IconComp = loc.icon;
              return (
                <button
                  key={loc.id}
                  onClick={() => handleSelectLocation(loc.title)}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl p-3 flex items-center gap-3.5 text-right transition-all active:scale-[0.99] cursor-pointer"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 shrink-0">
                    <IconComp className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-slate-900 truncate">{loc.title}</h5>
                    <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{loc.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Confirm Button */}
          <div className="pt-4 border-t border-slate-100 mt-2 shrink-0">
            <button
              onClick={onConfirmLocations}
              disabled={!pickupText.trim() || !dropoffText.trim() || isLoading}
              className="w-full py-4 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-base rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري حساب المسار والأجرة...</span>
                </>
              ) : (
                <span>تأكيد الوجهة وحساب الأجرة</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
