import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { profileService } from '../services/profileService';
import { Avatar } from '../../../components/ui/Avatar';
import { Camera, Save, AlertCircle, CheckCircle2, Loader2, User, Phone, Mail, Shield, UserCheck } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, session, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      const newAvatarUrl = await profileService.uploadAvatar(user.id, file);
      setAvatarUrl(newAvatarUrl);
      
      // Auto save avatar update
      await profileService.updateProfile(user.id, { avatar_url: newAvatarUrl });
      await refreshProfile();
      setSuccess('تم تحديث الصورة الشخصية بنجاح!');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع الصورة الشخصية.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      await profileService.updateProfile(user.id, {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl,
      });

      await refreshProfile();
      setSuccess('تم حفظ التغييرات بنجاح!');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ التغييرات.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-600 dir-rtl">
        يرجى تسجيل الدخول لعرض وتحديث بياناتك الشخصية.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <Avatar src={avatarUrl} alt={user.full_name} size="xl" isLoading={isUploading} />
          <label className="absolute bottom-0 left-0 bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-full cursor-pointer shadow-md transition-all">
            <Camera className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        <div className="text-center sm:text-right space-y-1.5 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl font-bold text-slate-900">{user.full_name}</h2>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {user.is_active ? 'حساب نشط' : 'حساب غير نشط'}
            </span>
          </div>

          <p className="text-sm text-slate-500">{session?.user?.email}</p>

          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">
              الأدوار: {user.roles.join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{success}</div>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 mb-6 pb-3 border-b border-slate-100 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-600" />
          <span>تعديل البيانات الشخصية</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                رقم الهاتف
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Read-Only Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                البريد الإلكتروني (للقراءة فقط)
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  disabled
                  value={session?.user?.email || ''}
                  className="w-full pl-4 pr-11 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed dir-ltr text-right"
                />
              </div>
            </div>

            {/* Read-Only Roles */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                الأدوار والصلاحيات الممنوحة
              </label>
              <div className="relative">
                <Shield className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  disabled
                  value={user.roles.join(', ')}
                  className="w-full pl-4 pr-11 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Bio / Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              نبذة تعريفية / Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب نبذة مختصرة عن نفسك أو نشاطك..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-900"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري حفظ البيانات...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
