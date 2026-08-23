import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { NotificationPreferences } from '../../../types/auth';
import { ProfilePage } from './ProfilePage';
import {
  User,
  Shield,
  Bell,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  MessageSquare,
  Tag,
  KeyRound,
  Lock,
  Save,
  Clock,
} from 'lucide-react';

type SettingsTab = 'profile' | 'security' | 'notifications';

export const AccountSettingsPage: React.FC = () => {
  const { user, session, signOut, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Security Tab State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityStatus, setSecurityStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);
  const [notifStatus, setNotifStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Notification Preferences when tab is switched or user changes
  const loadNotificationPreferences = useCallback(async () => {
    if (!user) return;
    setIsLoadingNotifs(true);
    setNotifStatus(null);
    try {
      const prefs = await notificationService.getPreferences(user.id);
      setNotifPrefs(prefs);
    } catch (err: any) {
      setNotifStatus({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء تحميل تفضيلات الإشعارات.',
      });
    } finally {
      setIsLoadingNotifs(false);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'notifications' && user) {
      loadNotificationPreferences();
    }
  }, [activeTab, user, loadNotificationPreferences]);

  // Handle Password Change via Supabase Auth
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityStatus(null);

    if (newPassword.length < 6) {
      setSecurityStatus({ type: 'error', message: 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: 'error', message: 'كلمتا المرور غير متطابقتين.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await resetPassword(newPassword);
      setSecurityStatus({ type: 'success', message: 'تم تحديث كلمة المرور بنجاح!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityStatus({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء تغيير كلمة المرور. يرجى المحاولة لاحقاً.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Toggle Notification Preference item
  const handleTogglePreference = async (key: 'push_enabled' | 'sms_enabled' | 'promotional_enabled') => {
    if (!user || !notifPrefs) return;

    const newValue = !notifPrefs[key];
    const updatedLocal = { ...notifPrefs, [key]: newValue };
    setNotifPrefs(updatedLocal);
    setIsSavingNotifs(true);
    setNotifStatus(null);

    try {
      const savedPrefs = await notificationService.updatePreferences(user.id, {
        [key]: newValue,
      });
      setNotifPrefs(savedPrefs);
      setNotifStatus({ type: 'success', message: 'تم حفظ تفضيلات الإشعارات بنجاح!' });
    } catch (err: any) {
      // Revert on error
      setNotifPrefs(notifPrefs);
      setNotifStatus({
        type: 'error',
        message: err.message || 'فشل حفظ التفضيل، تم إلغاء التغيير.',
      });
    } finally {
      setIsSavingNotifs(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-600 dir-rtl">
        يرجى تسجيل الدخول لعرض وتحديث إعدادات الحساب.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 dir-rtl">
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h2 className="text-2xl font-bold text-slate-900">إعدادات الحساب والأمان</h2>
        <p className="text-sm text-slate-500 mt-1">
          إدارة البيانات الشخصية، أمان كلمة المرور، وتفضيلات استقبال التنبيهات
        </p>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>الملف الشخصي</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>الأمان وكلمة المرور</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>تفضيلات الإشعارات</span>
          </button>

          <button
            onClick={() => signOut()}
            className="mr-auto px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PROFILE PAGE */}
      {activeTab === 'profile' && <ProfilePage />}

      {/* TAB 2: ACCOUNT SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password Change Form */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              <span>تغيير كلمة المرور</span>
            </h3>

            {securityStatus && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                  securityStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {securityStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="leading-relaxed font-medium">{securityStatus.message}</div>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  كلمة المرور الجديدة *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-right dir-ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  تأكيد كلمة المرور الجديدة *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-right dir-ltr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>تحديث كلمة المرور</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Session & Active Credentials Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>تفاصيل الجلسة والأمان الحالية</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-semibold">البريد الإلكتروني الموثق</div>
                <div className="font-bold text-slate-900 dir-ltr text-right">{session?.user?.email}</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="text-xs text-slate-500 font-semibold">تاريخ إنشاء الحساب</div>
                <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>{new Date(user.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => signOut()}
                className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-rose-200 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>إنهاء الجلسة وتسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATION PREFERENCES */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600" />
              <span>إعدادات الإشعارات والتنبيهات</span>
            </h3>

            {isSavingNotifs && (
              <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-semibold border border-emerald-200 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري حفظ التغييرات...</span>
              </span>
            )}
          </div>

          {/* Feedback Status Alert */}
          {notifStatus && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${
                notifStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {notifStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed font-medium">{notifStatus.message}</div>
            </div>
          )}

          {isLoadingNotifs ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <p className="text-sm">جاري جلب تفضيلات الإشعارات الشخصية...</p>
            </div>
          ) : notifPrefs ? (
            <div className="space-y-4">
              {/* Push Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">إشعارات التطبيق الفورية (Push Notifications)</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      تلقي تنبيهات فورية بحالة الطلبات ورسائل الرحلات على جوالك
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mr-4">
                  <input
                    type="checkbox"
                    checked={notifPrefs.push_enabled}
                    onChange={() => handleTogglePreference('push_enabled')}
                    disabled={isSavingNotifs}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* SMS Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">الرسائل النصية القصيرة (SMS)</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      استلام رموز التأكيد وتنبيهات الطوارئ عبر رقم الهاتف المحمول
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mr-4">
                  <input
                    type="checkbox"
                    checked={notifPrefs.sms_enabled}
                    onChange={() => handleTogglePreference('sms_enabled')}
                    disabled={isSavingNotifs}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Promotional Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">العروض والتخفيضات الترويجية</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      التنبيه بالعروض الموسمية والخصومات الجديدة في سوق كفراوي بكفر البطيخ ودمياط
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mr-4">
                  <input
                    type="checkbox"
                    checked={notifPrefs.promotional_enabled}
                    onChange={() => handleTogglePreference('promotional_enabled')}
                    disabled={isSavingNotifs}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              تعذر تحميل سجل التفضيلات.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
