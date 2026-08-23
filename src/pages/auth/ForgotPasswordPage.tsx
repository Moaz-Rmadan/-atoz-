import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, KeyRound, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ForgotPasswordPageProps {
  onBackToLogin?: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onBackToLogin }) => {
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('يرجى كتابة البريد الإلكتروني');
      return;
    }

    try {
      await forgotPassword(email.trim());
      setIsSent(true);
    } catch (err: any) {
      // Handled in context
    }
  };

  const displayError = localError || error;

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 dir-rtl">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">استعادة كلمة المرور</h2>
        <p className="text-sm text-slate-500 mt-1">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
      </div>

      {displayError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{displayError}</div>
        </div>
      )}

      {isSent ? (
        <div className="text-center space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-start gap-3 text-right">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني (<span className="font-semibold">{email}</span>). يرجى مراجعة صندوق الوارد والبريد المهمل.
            </div>
          </div>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors cursor-pointer w-full"
            >
              العودة إلى تسجيل الدخول
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              البريد الإلكتروني المسجل
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 dir-ltr text-right"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري إرسال الرابط...</span>
              </>
            ) : (
              <span>إرسال رابط الاستعادة</span>
            )}
          </button>
        </form>
      )}

      {onBackToLogin && !isSent && (
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لصفحة تسجيل الدخول</span>
          </button>
        </div>
      )}
    </div>
  );
};
