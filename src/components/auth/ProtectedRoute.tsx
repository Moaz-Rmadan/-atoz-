import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AppRole, AppPermission } from '../../types/auth';
import { ShieldAlert, Loader2, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requiredPermission?: AppPermission;
  requiredPermissions?: AppPermission[];
  fallback?: React.ReactNode;
  onNavigateToLogin?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  requiredPermissions,
  fallback,
  onNavigateToLogin,
}) => {
  const { user, isAuthenticated, isLoading, hasAnyRole, hasPermission, hasAnyPermission, isAdmin } = useAuth();

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-slate-600 dir-rtl">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-base font-medium">جاري التحقق من بيانات الهوية والأمان...</p>
      </div>
    );
  }

  // 2. Unauthenticated state
  if (!isAuthenticated || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center dir-rtl">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">تسجيل الدخول مطلوب</h3>
        <p className="text-slate-600 max-w-md mb-6 leading-relaxed">
          هذه الصفحة محمية. يرجى تسجيل الدخول بحسابك للوصول إلى كافة الخدمات والخصائص المتاحة.
        </p>
        {onNavigateToLogin && (
          <button
            onClick={onNavigateToLogin}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            الانتقال لصفحة تسجيل الدخول
          </button>
        )}
      </div>
    );
  }

  // 3. Check Account Status (active/inactive)
  if (!user.is_active) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center dir-rtl">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">الحساب غير نشط</h3>
        <p className="text-slate-600 max-w-md mb-4 leading-relaxed">
          عذراً، حسابك مغلق أو معطل حالياً. يرجى التواصل مع إدارة المنصة لإعادة التفعيل.
        </p>
      </div>
    );
  }

  // Admin bypasses role and permission checks
  if (isAdmin()) {
    return <>{children}</>;
  }

  // 4. Check Role Authorization
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleAllowed = hasAnyRole(allowedRoles);
    if (!isRoleAllowed) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center dir-rtl">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">غير مصرح بالوصول</h3>
          <p className="text-slate-600 max-w-md mb-4 leading-relaxed">
            عذراً، حسابك الحالي بدرجة (<span className="font-semibold text-slate-800">{user.roles.join(', ')}</span>) لا يملك الأذونات الكافية لاستعراض هذه الصفحة.
          </p>
          <span className="inline-flex items-center px-3.5 py-1 bg-rose-100 text-rose-800 text-xs font-semibold rounded-full border border-rose-200">
            المسار يتطلب دور: {allowedRoles.join(' أو ')}
          </span>
        </div>
      );
    }
  }

  // 5. Check Single Permission Authorization
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center dir-rtl">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">إذن تشغيل غير متوفر</h3>
        <p className="text-slate-600 max-w-md mb-4 leading-relaxed">
          يتطلب الوصول لهذه الخاصية الحصول على إذن ({requiredPermission}).
        </p>
      </div>
    );
  }

  // 6. Check Multiple Permissions Authorization
  if (requiredPermissions && requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center dir-rtl">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">إذن تشغيل غير متوفر</h3>
        <p className="text-slate-600 max-w-md mb-4 leading-relaxed">
          يتطلب الوصول لهذه الخاصية أحد أذونات التشغيل التالية: ({requiredPermissions.join(', ')}).
        </p>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
};
