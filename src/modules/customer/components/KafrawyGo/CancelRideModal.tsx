import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Check } from 'lucide-react';

interface CancelRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (reason: string) => Promise<void>;
  isLoading?: boolean;
  role?: 'customer' | 'driver';
}

const CUSTOMER_CANCEL_REASONS = [
  'انتظرت طويلاً والكابتن تأخر',
  'وجدت وسيلة مواصلات أخرى',
  'قمت بتحديد نقطة انطلاق أو وجهة خاطئة',
  'غيرت رأيي ولن أتحرك الآن',
  'الكابتن طلب مني إلغاء الرحلة',
  'سبب آخر',
];

const DRIVER_CANCEL_REASONS = [
  'وصلت لنقطة الالتقاء والعميل لم يحضر',
  'تعذر الاتصال بالعميل على الهاتف',
  'عطل مفاجئ في المركبة',
  'ازدحام شديد أو طريق مغلق',
  'العميل طلب مني الإلغاء',
  'سبب آخر',
];

export const CancelRideModal: React.FC<CancelRideModalProps> = ({
  isOpen,
  onClose,
  onConfirmCancel,
  isLoading = false,
  role = 'customer',
}) => {
  const reasons = role === 'driver' ? DRIVER_CANCEL_REASONS : CUSTOMER_CANCEL_REASONS;
  const [selectedReason, setSelectedReason] = useState<string>(reasons[0]);
  const [customReason, setCustomReason] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const reasonToSend =
      selectedReason === 'سبب آخر' && customReason.trim()
        ? customReason.trim()
        : selectedReason;
    await onConfirmCancel(reasonToSend);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={isLoading ? undefined : onClose}
        />

        {/* Modal Box */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-sm bg-white rounded-3xl p-5 z-10 shadow-2xl border border-slate-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
              <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span>{role === 'driver' ? 'إلغاء الرحلة من طرف الكابتن' : 'إلغاء الرحلة'}</span>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 font-medium mb-4 leading-relaxed">
            {role === 'driver'
              ? 'يرجى تحديد سبب تعذر إتمام هذه الرحلة لتحديث سجل الكابتن:'
              : 'يرجى تحديد سبب الإلغاء لمساعدتنا في تحسين جودة خدمة كفراوي Go:'}
          </p>

          <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
            {reasons.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-right p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  selectedReason === reason
                    ? 'bg-rose-50/70 border-rose-300 text-rose-900 ring-1 ring-rose-200'
                    : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{reason}</span>
                {selectedReason === reason && <Check className="w-4 h-4 text-rose-600 shrink-0 mr-2" />}
              </button>
            ))}
          </div>

          {selectedReason === 'سبب آخر' && (
            <div className="mb-4">
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="اكتب سبب الإلغاء هنا..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-slate-900"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري الإلغاء...</span>
                </>
              ) : (
                <span>تأكيد إلغاء الرحلة</span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              تراجع
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
