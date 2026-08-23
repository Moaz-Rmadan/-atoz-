import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppRole } from '../../types/auth';
import { Mail, Lock, User, Phone, UserPlus, AlertCircle, Eye, EyeOff, Loader2, Briefcase, Car, Store, Wrench, ShieldCheck } from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin?: () => void;
  onSuccess?: () => void;
}

const ROLES_OPTIONS: { id: AppRole; title: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'customer',
    title: 'عميل / مستخدم',
    description: 'تصفح الخدمات، طلب الرحلات، الشراء من السوق والتقديم للوظائف',
    icon: <User className="w-5 h-5 text-emerald-600" />,
  },
  {
    id: 'driver',
    title: 'كابتن / سائق',
    description: 'تقديم خدمات التنقل والشحن واستقبال طلبات الرحلات',
    icon: <Car className="w-5 h-5 text-blue-600" />,
  },
  {
    id: 'provider',
    title: 'مقدم خدمة / حرفي',
    description: 'عرض الصيانة والخدمات المنزلية وتلقي الحجوزات Direct',
    icon: <Wrench className="w-5 h-5 text-amber-600" />,
  },
  {
    id: 'merchant',
    title: 'تاجر / متجر',
    description: 'عرض المنتجات بالسوق المحلي وإدارة المبيعات والطلبات',
    icon: <Store className="w-5 h-5 text-purple-600" />,
  },
  {
    id: 'employer',
    title: 'صاحب عمل / شركة',
    description: 'نشر إعلانات الوظائف واستقبال السير الذاتية والتوظيف',
    icon: <Briefcase className="w-5 h-5 text-indigo-600" />,
  },
];

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSwitchToLogin,
  onSuccess,
}) => {
  const { signUp, isLoading, error, clearError } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setLocalError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (password.length < 6) {
      setLocalError('كلمة المرور يجب أن لا تقل عن 6 أحرف');
      return;
    }

    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        password,
        role,
      });

      setSuccessMessage('تم إنشاء الحساب بنجاح! يمكنك الآن استخدام منصة كفراوي.');
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      // Handled in context
    }
  };

  const displayError = localError || error;

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 dir-rtl">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <UserPlus className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">إنشاء حساب جديد</h2>
        <p className="text-sm text-slate-500 mt-1">انضم لعالم كفراوي الموحد للخدمات والتنقل والتجارة</p>
      </div>

      {displayError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{displayError}</div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            الاسم بالكامل *
          </label>
          <div className="relative">
            <User className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="محمد أحمد علي"
              className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
            />
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              البريد الإلكتروني *
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

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              رقم الهاتف (اختياري)
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01012345678"
                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 dir-ltr text-right"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            كلمة المرور *
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900 dir-ltr text-right"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            حدد نوع الحساب والاستخدام الرئيسي
          </label>
          <div className="space-y-2">
            {ROLES_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  role === opt.id
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="userRole"
                  value={opt.id}
                  checked={role === opt.id}
                  onChange={() => setRole(opt.id)}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span className="text-sm font-bold text-slate-900">{opt.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{opt.description}</p>
                </div>
              </label>
            ))}
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
              <span>جاري إنشاء الحساب...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>إنشاء الحساب الآن</span>
            </>
          )}
        </button>
      </form>

      {onSwitchToLogin && (
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
          لديك حساب بالفعل؟{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            تسجيل الدخول
          </button>
        </div>
      )}
    </div>
  );
};
