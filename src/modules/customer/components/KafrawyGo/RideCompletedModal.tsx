import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Star, Banknote, MapPin, Navigation, ThumbsUp, Send } from 'lucide-react';
import { Ride } from '../../services/mobilityApi';

interface RideCompletedModalProps {
  isOpen: boolean;
  ride: Ride | null;
  onClose: () => void;
  onSubmitRating: (rating: number, comment?: string) => void;
}

export const RideCompletedModal: React.FC<RideCompletedModalProps> = ({
  isOpen,
  ride,
  onClose,
  onSubmitRating,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !ride) return null;

  const handleSubmit = () => {
    setIsSubmitted(true);
    onSubmitRating(rating, comment);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm bg-white rounded-[32px] p-6 z-10 shadow-2xl border border-slate-100 overflow-hidden text-center"
        >
          {/* Top Success Icon */}
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-bounce" />
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-1">وصلت بالسلامة!</h3>
          <p className="text-xs text-slate-500 font-medium mb-5">نتمنى أن تكون رحلتك مع كفراوي Go ممتعة وآمنة</p>

          {/* Fare Summary Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-5 space-y-3 text-right">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">المبلغ المطلوب للدفع:</span>
              <div
                className="text-xl font-black text-emerald-700"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {ride.final_fare || ride.estimated_fare} <span className="text-xs font-ibm-plex">ج.م</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <Banknote className="w-4 h-4 text-slate-400" />
                طريقة الدفع
              </span>
              <span className="font-bold text-slate-800">نقداً للكابتن (Cash Only)</span>
            </div>

            {/* Cash Collection State Indicator */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">حالة التحصيل:</span>
              {ride.payment_status === 'paid_cash' ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم استلام النقد
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                  يرجى تسليم المبلغ للكابتن
                </span>
              )}
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-5">
            <span className="text-xs font-bold text-slate-700 block mb-2">كيف كانت تجربتك مع الكابتن؟</span>
            <div className="flex justify-center gap-2 flex-row-reverse">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform active:scale-90 cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Optional Comment */}
          <div className="mb-5">
            <input
              type="text"
              placeholder="اكتب كلمة شكر أو ملاحظة للكابتن (اختياري)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              onClick={handleSubmit}
              disabled={isSubmitted}
              className="flex-1 py-3.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>تأكيد وإنهاء</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl transition-all active:scale-95 cursor-pointer"
            >
              تخطي
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
