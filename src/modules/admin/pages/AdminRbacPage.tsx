import React, { useEffect, useState, useCallback } from 'react';
import { roleService, SystemRole, SystemPermission, UserWithRoles } from '../../auth/services/roleService';
import { useAuth } from '../../../context/AuthContext';
import { AppRole, VerificationStatus } from '../../../types/auth';
import { adminApi, AdminStats, AdminMerchant, AdminProvider, AdminDriver, AdminAuditLog, AdminOrder, AdminServiceRequest } from '../services/adminApi';
import { mobilityApi } from '../../customer/services/mobilityApi';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import {
  Shield,
  ShieldCheck,
  Users,
  Key,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
  UserX,
  Loader2,
  RefreshCw,
  Lock,
  Layers,
  Store,
  Wrench,
  Car,
  Briefcase,
  TrendingUp,
  ShoppingBag,
  Bell,
  FileText,
  Sliders,
  ChevronLeft,
  Settings,
  Activity,
  X,
  Eye,
} from 'lucide-react';

type AdminTab =
  | 'dashboard'
  | 'users'
  | 'merchants'
  | 'providers'
  | 'drivers'
  | 'orders'
  | 'services'
  | 'roles'
  | 'audit'
  | 'settings';

export const AdminRbacPage: React.FC = () => {
  const { user: currentUser, refreshProfile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Data Lists
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [adminRides, setAdminRides] = useState<any[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<AdminServiceRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // RBAC Setup lists
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [rolePermMap, setRolePermMap] = useState<Record<string, Set<string>>>({});

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    action: () => Promise<void>;
  } | null>(null);

  // Detailed view of log entry
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      // 1. Load active tab data to be fully optimized
      const statsData = await adminApi.getAdminStats();
      setStats(statsData);

      if (activeTab === 'dashboard') {
        // Just loaded stats
      } else if (activeTab === 'users') {
        const allUsers = await roleService.getAllUsersWithRoles();
        setUsers(allUsers);
      } else if (activeTab === 'merchants') {
        const allMerchants = await adminApi.getMerchants();
        setMerchants(allMerchants);
      } else if (activeTab === 'providers') {
        const allProviders = await adminApi.getProviders();
        setProviders(allProviders);
      } else if (activeTab === 'drivers') {
        const [allDrivers, allRides] = await Promise.all([
          adminApi.getDrivers(),
          mobilityApi.getAllRidesForAdmin()
        ]);
        setDrivers(allDrivers);
        setAdminRides(allRides);
      } else if (activeTab === 'orders') {
        const allOrders = await adminApi.getOrders();
        setOrders(allOrders);
      } else if (activeTab === 'services') {
        const allRequests = await adminApi.getServiceRequests();
        setServiceRequests(allRequests);
      } else if (activeTab === 'roles') {
        const [allRoles, allPerms] = await Promise.all([
          roleService.getAllRoles(),
          roleService.getAllPermissions(),
        ]);
        setRoles(allRoles);
        setPermissions(allPerms);

        const matrixMap: Record<string, Set<string>> = {};
        for (const r of allRoles) {
          const permIds = await roleService.getRolePermissionIds(r.id);
          matrixMap[r.id] = new Set(permIds);
        }
        setRolePermMap(matrixMap);
      } else if (activeTab === 'audit') {
        const allLogs = await adminApi.getAuditLogs();
        setAuditLogs(allLogs);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء تحميل البيانات من قاعدة البيانات.' });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Route Guard Check
  if (!isAdmin()) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center dir-rtl">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 border border-rose-100">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">غير مصرح بالوصول</h3>
        <p className="text-slate-600 max-w-md leading-relaxed mb-6">
          عذراً، حسابك الحالي لا يملك صلاحيات الإدارة الكافية لاستعراض لوحة تحكم المدير العام.
        </p>
        <span className="inline-flex items-center px-4 py-1.5 bg-rose-100 text-rose-800 text-sm font-bold rounded-full border border-rose-200">
          يتطلب دور: admin
        </span>
      </div>
    );
  }

  // Toast auto-clear
  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Safe action trigger
  const triggerConfirmation = (title: string, desc: string, action: () => Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      desc,
      action: async () => {
        try {
          setIsLoading(true);
          await action();
          setConfirmModal(null);
          await loadData();
        } catch (err: any) {
          showToast('error', err.message || 'حدث خطأ أثناء تنفيذ العملية.');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // --- ACTIONS ---

  // User Actions
  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    if (userId === currentUser?.id) {
      showToast('error', 'لا يمكنك تعطيل حسابك الشخصي الذي تستخدمه الآن!');
      return;
    }
    triggerConfirmation(
      currentActive ? 'تعطيل حساب مستخدم' : 'تنشيط حساب مستخدم',
      `هل أنت متأكد من رغبتك في ${currentActive ? 'تعطيل' : 'تنشيط'} هذا الحساب؟ لن يتمكن المستخدم من تسجيل الدخول إذا تم تعطيله.`,
      async () => {
        await roleService.toggleUserActiveStatus(userId, !currentActive);
        showToast('success', 'تم تحديث حالة الحساب بنجاح.');
      }
    );
  };

  const handleToggleUserRole = async (userId: string, roleName: AppRole, hasRole: boolean) => {
    // Safety check: Prevent removing the last admin on the frontend side
    if (roleName === 'admin' && hasRole) {
      const adminUsers = users.filter((u) => u.roles.some((r) => r.name === 'admin'));
      if (adminUsers.length <= 1) {
        showToast('error', 'لا يمكن سحب دور المشرف من هذا الحساب؛ يجب أن يتبقى مشرف واحد على الأقل في النظام.');
        return;
      }
    }

    triggerConfirmation(
      hasRole ? 'سحب دور' : 'منح دور جديد',
      `هل أنت متأكد من رغبتك في ${hasRole ? 'سحب دور' : 'منح دور'} (${roleName}) لهذا المستخدم؟`,
      async () => {
        await roleService.toggleUserRole(userId, roleName, hasRole);
        showToast('success', 'تم تحديث أدوار المستخدم بنجاح.');
        if (userId === currentUser?.id) {
          await refreshProfile();
        }
      }
    );
  };

  // Merchant Actions
  const handleUpdateMerchant = async (merchantId: string, name: string, status: VerificationStatus) => {
    const statusLabels: Record<VerificationStatus, string> = {
      pending: 'قيد الانتظار',
      approved: 'اعتماد وتنشيط',
      rejected: 'رفض طلب',
      suspended: 'تعليق حساب التاجر',
    };
    triggerConfirmation(
      `تغيير حالة التاجر (${name})`,
      `هل تريد تأكيد تغيير حالة المتجر إلى "${statusLabels[status]}"؟ سيتم تسجيل هذا الإجراء تلقائياً في سجلات الأمان.`,
      async () => {
        await adminApi.updateMerchantStatus(merchantId, status);
        showToast('success', 'تم تحديث حالة التاجر وتسجيل العملية.');
      }
    );
  };

  // Service Provider Actions
  const handleUpdateProvider = async (providerId: string, name: string, status: VerificationStatus) => {
    const statusLabels: Record<VerificationStatus, string> = {
      pending: 'قيد المراجعة',
      approved: 'اعتماد مقدم الخدمة',
      rejected: 'رفض طلب المقدم',
      suspended: 'تعليق حساب مقدم الخدمة',
    };
    triggerConfirmation(
      `تعديل حالة مقدم الخدمة (${name})`,
      `هل تريد تأكيد تغيير حالة مقدم الخدمة إلى "${statusLabels[status]}"؟`,
      async () => {
        await adminApi.updateProviderStatus(providerId, status);
        showToast('success', 'تم تحديث حالة مقدم الخدمة بنجاح.');
      }
    );
  };

  // Driver Actions
  const handleUpdateDriver = async (driverId: string, name: string, status: VerificationStatus) => {
    const statusLabels: Record<VerificationStatus, string> = {
      pending: 'قيد الانتظار',
      approved: 'اعتماد السائق وتنشيطه',
      rejected: 'رفض طلب الانضمام',
      suspended: 'تعليق رخصة السائق',
    };
    triggerConfirmation(
      `تغيير حالة السائق (${name})`,
      `هل تريد تأكيد تغيير حالة السائق إلى "${statusLabels[status]}"؟ ستتأثر قدرة السائق على استقبال الرحلات.`,
      async () => {
        await adminApi.updateDriverStatus(driverId, status);
        showToast('success', 'تم تحديث حالة السائق بنجاح في قاعدة البيانات.');
      }
    );
  };

  // Role Permissions mapping toggler
  const handleToggleRolePermission = async (roleId: string, permId: string, isAssigned: boolean) => {
    // Safeguard: Do not strip permissions from admin if it disables basic access
    const roleObj = roles.find((r) => r.id === roleId);
    if (roleObj?.name === 'admin' && isAssigned) {
      const permObj = permissions.find((p) => p.id === permId);
      if (permObj?.code === 'admin:all') {
        showToast('error', 'ممنوع سحب الصلاحية المطلقة (admin:all) من دور المدير العام لتجنب قفل الحسابات!');
        return;
      }
    }

    triggerConfirmation(
      isAssigned ? 'إلغاء ربط صلاحية' : 'ربط صلاحية جديدة بالدور',
      `هل تريد تعديل مصفوفة الصلاحيات لهذا الدور؟`,
      async () => {
        await roleService.toggleRolePermission(roleId, permId, isAssigned);
        showToast('success', 'تم تحديث مصفوفة الصلاحيات للدور بنجاح.');
      }
    );
  };

  // Status Badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'delivered':
        return <Badge variant="success">نشط / معتمد</Badge>;
      case 'pending':
        return <Badge variant="warning">قيد المراجعة</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge variant="error">مرفوض / ملغى</Badge>;
      case 'suspended':
        return <Badge variant="neutral">موقوف مؤقتاً</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row dir-rtl font-sans pb-12">
      {/* Sidebar navigation */}
      <aside className="w-full lg:w-72 bg-white border-l border-slate-200 shrink-0 flex flex-col">
        {/* Brand */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white border border-emerald-500 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-950">لوحة تحكم الإدارة</h2>
            <p className="text-[11px] text-slate-500 font-medium">نظام حماية كفراوي الموحد</p>
          </div>
        </div>

        {/* Manager Card */}
        <div className="p-4 mx-4 my-4 bg-slate-50 rounded-2xl border border-slate-150 flex items-center gap-3">
          <Avatar name={currentUser?.full_name || 'مدير'} src={currentUser?.avatar_url || ''} size="md" />
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-900 truncate">{currentUser?.full_name}</h4>
            <span className="text-[10px] inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 mt-1">
              <ShieldCheck className="w-3 h-3" />
              <span>مدير عام النظام</span>
            </span>
          </div>
        </div>

        {/* Menu Links */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {[
            { id: 'dashboard', label: 'الرئيسية والإحصائيات', icon: TrendingUp },
            { id: 'users', label: 'المستخدمون والأدوار', icon: Users },
            { id: 'merchants', label: 'إدارة التجار', icon: Store },
            { id: 'providers', label: 'مقدمو الخدمات', icon: Wrench },
            { id: 'drivers', label: 'السائقين والمركبات', icon: Car },
            { id: 'orders', label: 'طلبات المتجر', icon: ShoppingBag },
            { id: 'services', label: 'طلبات الصيانة والخدمات', icon: Sliders },
            { id: 'roles', label: 'الصلاحيات والمصفوفة', icon: Key },
            { id: 'audit', label: 'سجل العمليات Audit Logs', icon: FileText },
            { id: 'settings', label: 'الإعدادات العامة', icon: Settings },
          ].map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as AdminTab);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Section */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-hidden">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في لوحة التحكم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer text-slate-600 flex items-center justify-center"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-slate-600">اتصال آمن مفعّل RLS</span>
            </div>
          </div>
        </header>

        {/* Global Toast Message */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 animate-slide-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <p className="text-xs font-bold leading-normal">{statusMessage.text}</p>
          </div>
        )}

        {/* LOADING SKELETON */}
        {isLoading && !confirmModal?.isOpen && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 animate-pulse">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                  <div className="h-3.5 bg-slate-100 rounded-md w-2/3" />
                  <div className="h-6 bg-slate-100 rounded-md w-1/3" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 h-64 animate-pulse" />
          </div>
        )}

        {/* VIEW: DASHBOARD */}
        {!isLoading && activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Header title */}
            <div>
              <h1 className="text-xl font-bold text-slate-900">مرحباً بك، {currentUser?.full_name}</h1>
              <p className="text-xs text-slate-500 mt-1">نظرة عامة على نشاط المنصة الكلي وإحصائيات النظام المسجلة</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-100' },
                { label: 'إجمالي التجار', value: stats.totalMerchants, icon: Store, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                { label: 'إجمالي مقدمي الخدمات', value: stats.totalProviders, icon: Wrench, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                { label: 'إجمالي السائقين الكباتن', value: stats.totalDrivers, icon: Car, color: 'bg-purple-50 text-purple-700 border-purple-100' },
                { label: 'إجمالي أصحاب العمل', value: stats.totalEmployers, icon: Briefcase, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                { label: 'إجمالي المنتجات', value: stats.totalProducts, icon: ShoppingBag, color: 'bg-pink-50 text-pink-700 border-pink-100' },
                { label: 'إجمالي طلبات المتجر', value: stats.totalOrders, icon: CheckCircle2, color: 'bg-sky-50 text-sky-700 border-sky-100' },
                { label: 'إجمالي طلبات الخدمات وصيانة', value: stats.totalServiceRequests, icon: Sliders, color: 'bg-rose-50 text-rose-700 border-rose-100' },
              ].map((stat, idx) => {
                const IconComponent = stat.icon;
                return (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-2xs">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">{stat.label}</span>
                      <span className="text-2xl font-black text-slate-950 block">{stat.value}</span>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${stat.color}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Warning block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">ضوابط الأمن والحماية والـ RLS مفعلة بالكامل</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    التحقق من صحة UUID يتم تلقائياً في قاعدة البيانات. يرجى مراجعة سجل العمليات (Audit Logs) بشكل مستمر لمراقبة جميع الأنشطة الحساسة.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('audit')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-[11px] cursor-pointer transition-all shrink-0"
              >
                استعراض سجل الأمان
              </button>
            </div>
          </div>
        )}

        {/* VIEW: USERS */}
        {!isLoading && activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">إدارة حسابات المستخدمين والمهام</h1>
              <p className="text-xs text-slate-500 mt-1">تنشيط أو تعطيل الحسابات، وإدارة المهام والأدوار (Roles) الممنوحة مباشرة</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-4 text-xs font-black text-slate-700">المستخدم</th>
                      <th className="p-4 text-xs font-black text-slate-700">رقم الهاتف</th>
                      <th className="p-4 text-xs font-black text-slate-700">تاريخ التسجيل</th>
                      <th className="p-4 text-xs font-black text-slate-700">الحالة</th>
                      <th className="p-4 text-xs font-black text-slate-700">الأدوار الحالية</th>
                      <th className="p-4 text-xs font-black text-slate-700 text-left">التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter((u) => u.full_name.includes(searchQuery) || (u.phone_number || '').includes(searchQuery))
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.full_name} src={u.avatar_url || ''} size="sm" />
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">{u.full_name}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">{u.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-600">{u.phone_number || 'غير متوفر'}</td>
                          <td className="p-4 text-xs font-medium text-slate-500">
                            {new Date(u.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}
                          </td>
                          <td className="p-4">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                نشط
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                                معطل
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r) => (
                                <span key={r.id} className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                                  {r.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-left">
                            <div className="inline-flex items-center gap-2">
                              {/* Toggle active status */}
                              <Button
                                size="sm"
                                variant={u.is_active ? 'secondary' : 'primary'}
                                onClick={() => handleToggleUserActive(u.id, u.is_active)}
                                className="text-[10px] py-1 h-auto cursor-pointer"
                              >
                                {u.is_active ? 'تعطيل الحساب' : 'تنشيط الحساب'}
                              </Button>

                              {/* Toggle admin role */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleToggleUserRole(
                                    u.id,
                                    'admin',
                                    u.roles.some((r) => r.name === 'admin')
                                  )
                                }
                                className="text-[10px] py-1 h-auto cursor-pointer"
                              >
                                {u.roles.some((r) => r.name === 'admin') ? 'سحب المشرف' : 'جعل مشرف'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: MERCHANTS */}
        {!isLoading && activeTab === 'merchants' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">طلبات التقديم واعتماد التجار والمتاجر</h1>
              <p className="text-xs text-slate-500 mt-1">مراجعة بيانات التجار والموافقة على متاجرهم، أو تعطيل الحسابات المخالفة</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-4 text-xs font-black text-slate-700">المتجر</th>
                      <th className="p-4 text-xs font-black text-slate-700">مالك المتجر</th>
                      <th className="p-4 text-xs font-black text-slate-700">رقم الهاتف</th>
                      <th className="p-4 text-xs font-black text-slate-700">التقييم</th>
                      <th className="p-4 text-xs font-black text-slate-700">تاريخ الانضمام</th>
                      <th className="p-4 text-xs font-black text-slate-700">الحالة</th>
                      <th className="p-4 text-xs font-black text-slate-700 text-left">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {merchants
                      .filter((m) => m.store_name.includes(searchQuery) || m.owner_name.includes(searchQuery))
                      .map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {m.store_logo_url ? (
                                <img
                                  src={m.store_logo_url}
                                  alt={m.store_name}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
                                  <Store className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">{m.store_name}</span>
                                {m.bio && <span className="text-[10px] text-slate-500 block max-w-xs truncate">{m.bio}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-800">{m.owner_name}</td>
                          <td className="p-4 text-xs font-medium text-slate-600">{m.owner_phone || 'غير متوفر'}</td>
                          <td className="p-4 text-xs font-bold text-amber-600">⭐ {m.rating_average.toFixed(1)}</td>
                          <td className="p-4 text-xs font-medium text-slate-500">
                            {new Date(m.created_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-4">{getStatusBadge(m.approval_status)}</td>
                          <td className="p-4 text-left">
                            <div className="inline-flex items-center gap-1.5">
                              {m.approval_status !== 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateMerchant(m.id, m.store_name, 'approved')}
                                  className="text-[10px] py-1 bg-emerald-600 hover:bg-emerald-700 h-auto cursor-pointer text-white"
                                >
                                  اعتماد
                                </Button>
                              )}
                              {m.approval_status !== 'suspended' && m.approval_status !== 'pending' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleUpdateMerchant(m.id, m.store_name, 'suspended')}
                                  className="text-[10px] py-1 h-auto cursor-pointer"
                                >
                                  تعليق
                                </Button>
                              )}
                              {m.approval_status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateMerchant(m.id, m.store_name, 'rejected')}
                                  className="text-[10px] py-1 text-rose-600 hover:bg-rose-50 h-auto cursor-pointer border-rose-200"
                                >
                                  رفض
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PROVIDERS */}
        {!isLoading && activeTab === 'providers' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">اعتماد مقدمي الخدمات والحرفيين المهنيين</h1>
              <p className="text-xs text-slate-500 mt-1">مراجعة مهارات مقدمي الخدمات والموافقة على طلباتهم للتفاعل في السوق</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-4 text-xs font-black text-slate-700">مقدم الخدمة</th>
                      <th className="p-4 text-xs font-black text-slate-700">رقم الهاتف</th>
                      <th className="p-4 text-xs font-black text-slate-700">نبذة</th>
                      <th className="p-4 text-xs font-black text-slate-700 font-mono">المهام المنجزة</th>
                      <th className="p-4 text-xs font-black text-slate-700">التقييم</th>
                      <th className="p-4 text-xs font-black text-slate-700">الحالة</th>
                      <th className="p-4 text-xs font-black text-slate-700 text-left">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {providers
                      .filter((p) => p.provider_name.includes(searchQuery))
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
                                <Wrench className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-bold text-slate-900 block">{p.provider_name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-600">{p.provider_phone || 'غير متوفر'}</td>
                          <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{p.bio || 'لا توجد نبذة'}</td>
                          <td className="p-4 text-xs font-bold text-slate-900 font-mono">{p.jobs_completed_count}</td>
                          <td className="p-4 text-xs font-bold text-amber-600">⭐ {p.rating_average.toFixed(1)}</td>
                          <td className="p-4">{getStatusBadge(p.verification_status)}</td>
                          <td className="p-4 text-left">
                            <div className="inline-flex items-center gap-1.5">
                              {p.verification_status !== 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateProvider(p.id, p.provider_name, 'approved')}
                                  className="text-[10px] py-1 bg-emerald-600 hover:bg-emerald-700 h-auto cursor-pointer text-white"
                                >
                                  اعتماد وتنشيط
                                </Button>
                              )}
                              {p.verification_status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateProvider(p.id, p.provider_name, 'rejected')}
                                  className="text-[10px] py-1 text-rose-600 hover:bg-rose-50 h-auto cursor-pointer border-rose-200"
                                >
                                  رفض الطلب
                                </Button>
                              )}
                              {p.verification_status === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleUpdateProvider(p.id, p.provider_name, 'suspended')}
                                  className="text-[10px] py-1 h-auto cursor-pointer text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                                >
                                  تعليق الحساب
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: DRIVERS */}
        {!isLoading && activeTab === 'drivers' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">اعتماد ومتابعة سائقي Kafrawy Go</h1>
              <p className="text-xs text-slate-500 mt-1">التحقق من الهوية الوطنية ورقم رخص القيادة لتأمين حماية الركاب والرحلات</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-4 text-xs font-black text-slate-700">السائق الكابتن</th>
                      <th className="p-4 text-xs font-black text-slate-700">رقم الهاتف</th>
                      <th className="p-4 text-xs font-black text-slate-700 font-mono">الرقم القومي (ID)</th>
                      <th className="p-4 text-xs font-black text-slate-700 font-mono">رخصة القيادة</th>
                      <th className="p-4 text-xs font-black text-slate-700">توصيل الآن</th>
                      <th className="p-4 text-xs font-black text-slate-700">التقييم</th>
                      <th className="p-4 text-xs font-black text-slate-700">الحالة</th>
                      <th className="p-4 text-xs font-black text-slate-700 text-left">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drivers
                      .filter((d) => d.driver_name.includes(searchQuery))
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200">
                                <Car className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-bold text-slate-900 block">{d.driver_name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-600">{d.driver_phone || 'غير متوفر'}</td>
                          <td className="p-4 text-xs font-mono font-medium text-slate-500">{d.national_id}</td>
                          <td className="p-4 text-xs font-mono font-medium text-slate-500">{d.license_number}</td>
                          <td className="p-4">
                            {d.is_online ? (
                              <Badge variant="success">متصل (Online)</Badge>
                            ) : (
                              <Badge variant="neutral">غير متصل (Offline)</Badge>
                            )}
                          </td>
                          <td className="p-4 text-xs font-bold text-amber-600">⭐ {d.rating_average.toFixed(1)}</td>
                          <td className="p-4">{getStatusBadge(d.approval_status)}</td>
                          <td className="p-4 text-left">
                            <div className="inline-flex items-center gap-1.5">
                              {d.approval_status !== 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateDriver(d.id, d.driver_name, 'approved')}
                                  className="text-[10px] py-1 bg-emerald-600 hover:bg-emerald-700 h-auto cursor-pointer text-white"
                                >
                                  اعتماد
                                </Button>
                              )}
                              {d.approval_status !== 'suspended' && d.approval_status !== 'pending' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleUpdateDriver(d.id, d.driver_name, 'suspended')}
                                  className="text-[10px] py-1 h-auto cursor-pointer"
                                >
                                  تعليق
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIDES MONITORING SECTION */}
            <div className="mt-8 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                  مراقبة رحلات Kafrawy Go النشطة والتاريخية
                </h2>
                <p className="text-xs text-slate-500 mt-1">تتبع المسارات المباشرة للرحلات وأسعار التوصيل وحالة الأسطول والطلبات بكفر البطيخ ودمياط</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="p-4 text-xs font-black text-slate-700">الراكب (العميل)</th>
                        <th className="p-4 text-xs font-black text-slate-700">الكابتن المستلم</th>
                        <th className="p-4 text-xs font-black text-slate-700">المركبة المستخدمة</th>
                        <th className="p-4 text-xs font-black text-slate-700">خط السير (العنوان)</th>
                        <th className="p-4 text-xs font-black text-slate-700">التكلفة (Estimated)</th>
                        <th className="p-4 text-xs font-black text-slate-700">الحالة</th>
                        <th className="p-4 text-xs font-black text-slate-700">تاريخ الطلب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminRides.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-slate-400 font-bold">
                            لا توجد أي رحلات مسجلة في أسطول كفراوي جو حالياً.
                          </td>
                        </tr>
                      ) : (
                        adminRides.map((ride) => (
                          <tr key={ride.id} className="hover:bg-slate-50/30 transition-colors text-xs font-medium text-slate-600">
                            <td className="p-4 font-bold text-slate-950">{ride.customer_name || 'راكب كفراوي'}</td>
                            <td className="p-4 font-bold text-slate-900">{ride.driver_name || 'لم يحدد بعد'}</td>
                            <td className="p-4">{ride.vehicle_info || 'بدون سيارة'}</td>
                            <td className="p-4 max-w-xs truncate">
                              <span className="text-emerald-700 block">من: {ride.pickup_address_text}</span>
                              <span className="text-rose-700 block">إلى: {ride.dropoff_address_text}</span>
                            </td>
                            <td className="p-4 text-blue-700 font-black">{ride.final_fare || ride.estimated_fare || 'تحديد لاحق'} ج.م</td>
                            <td className="p-4">
                              {ride.status === 'requested' && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">بانتظار كابتن</span>}
                              {ride.status === 'driver_assigned' && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">الكابتن قادم</span>}
                              {ride.status === 'arrived' && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">وصل الموقع</span>}
                              {ride.status === 'in_transit' && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-200">في الطريق</span>}
                              {ride.status === 'completed' && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">مكتملة</span>}
                              {ride.status === 'cancelled' && <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-200">ملغاة</span>}
                            </td>
                            <td className="p-4 font-mono text-slate-400">{new Date(ride.created_at).toLocaleString('ar-EG')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ORDERS */}
        {!isLoading && activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">سجل طلبات المتجر والمبيعات</h1>
              <p className="text-xs text-slate-500 mt-1">مراقبة الفواتير الإجمالية وتاريخ الطلبات وحالتها داخل Kafrawy Super App</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-4 text-xs font-black text-slate-700">رقم الطلب</th>
                      <th className="p-4 text-xs font-black text-slate-700">العميل</th>
                      <th className="p-4 text-xs font-black text-slate-700">رقم الهاتف</th>
                      <th className="p-4 text-xs font-black text-slate-700">المتجر</th>
                      <th className="p-4 text-xs font-black text-slate-700">المبلغ الإجمالي</th>
                      <th className="p-4 text-xs font-black text-slate-700">التاريخ</th>
                      <th className="p-4 text-xs font-black text-slate-700">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders
                      .filter((o) => o.customer_name.includes(searchQuery) || o.store_name.includes(searchQuery))
                      .map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 text-xs font-bold text-slate-900 font-mono">{o.id}</td>
                          <td className="p-4 text-xs font-bold text-slate-800">{o.customer_name}</td>
                          <td className="p-4 text-xs font-medium text-slate-600">{o.customer_phone || 'غير متوفر'}</td>
                          <td className="p-4 text-xs font-bold text-emerald-700">{o.store_name}</td>
                          <td className="p-4 text-xs font-bold text-slate-900">
                            {o.total_amount.toLocaleString('ar-EG')} ج.م
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-500">
                            {new Date(o.created_at).toLocaleString('ar-EG')}
                          </td>
                          <td className="p-4">{getStatusBadge(o.status)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SERVICES */}
        {!isLoading && activeTab === 'services' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">طلبات الصيانة والخدمات المهنية</h1>
              <p className="text-xs text-slate-500 mt-1">تتبع الاتفاقات المالية ومقدمي الخدمات والحرفيين لحل الصراعات البرمجية والتشغيلية</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-4 text-xs font-black text-slate-700">معرّف الطلب</th>
                      <th className="p-4 text-xs font-black text-slate-700">الخدمة المطلوبة</th>
                      <th className="p-4 text-xs font-black text-slate-700">العميل صاحب الطلب</th>
                      <th className="p-4 text-xs font-black text-slate-700">مقدم الخدمة المكلّف</th>
                      <th className="p-4 text-xs font-black text-slate-700">السعر المتفق عليه</th>
                      <th className="p-4 text-xs font-black text-slate-700">تاريخ الإنشاء</th>
                      <th className="p-4 text-xs font-black text-slate-700">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {serviceRequests
                      .filter((s) => s.customer_name.includes(searchQuery) || s.service_title.includes(searchQuery))
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 text-xs font-medium text-slate-500 font-mono">{s.id}</td>
                          <td className="p-4 text-xs font-bold text-slate-900">{s.service_title}</td>
                          <td className="p-4 text-xs font-medium text-slate-800">{s.customer_name}</td>
                          <td className="p-4 text-xs font-medium text-slate-700">{s.provider_name}</td>
                          <td className="p-4 text-xs font-black text-emerald-800">
                            {s.agreed_price ? `${s.agreed_price.toLocaleString('ar-EG')} ج.م` : 'لم يتم الاتفاق'}
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-500">
                            {new Date(s.created_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-4">{getStatusBadge(s.status)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ROLES & MATRIX */}
        {!isLoading && activeTab === 'roles' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">مصفوفة الصلاحيات والأدوار الموحدة</h1>
              <p className="text-xs text-slate-500 mt-1">تحديد ما يسمح لكل دور بتنفيذه داخل المنصة. جميع التعديلات تعتمد على Supabase RLS مباشرة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Roles reference card */}
              <div className="md:col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      <span>الأدوار المتاحة بنظام كفراوي</span>
                    </CardTitle>
                    <CardDescription>قائمة فئات الحسابات الأساسية</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {roles.map((r) => (
                      <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 font-mono">{r.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{r.id.split('-')[0]}...</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">{r.description_ar}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Security matrix */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Key className="w-5 h-5 text-emerald-600" />
                      <span>مصفوفة الصلاحيات والحظر (Security Matrix)</span>
                    </CardTitle>
                    <CardDescription>اربط الصلاحيات البرمجية بالأدوار المناسبة</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-3 text-slate-700 font-bold">رمز الصلاحية برمجياً</th>
                          {roles.map((r) => (
                            <th key={r.id} className="pb-3 text-center text-slate-800 font-bold font-mono">
                              {r.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {permissions.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/20">
                            <td className="py-3">
                              <span className="font-mono font-bold text-slate-900 block">{p.code}</span>
                              <span className="text-[10px] text-slate-500">{p.description_ar}</span>
                            </td>
                            {roles.map((r) => {
                              const isAssigned = rolePermMap[r.id]?.has(p.id) ?? false;
                              return (
                                <td key={r.id} className="py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={() => handleToggleRolePermission(r.id, p.id, isAssigned)}
                                    className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: AUDIT LOGS */}
        {!isLoading && activeTab === 'audit' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">سجل مراقبة العمليات والحماية (Audit Logs)</h1>
              <p className="text-xs text-slate-500 mt-1">سجل أمني صارم وغير قابل للتعديل لتتبع عمليات الاعتماد، والرفض، وتعديل الصلاحيات.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-4 text-xs font-black text-slate-700">المسؤول (Actor)</th>
                      <th className="p-4 text-xs font-black text-slate-700">الإجراء</th>
                      <th className="p-4 text-xs font-black text-slate-700">الجدول المستهدف</th>
                      <th className="p-4 text-xs font-black text-slate-700">رقم الكيان المستهدف</th>
                      <th className="p-4 text-xs font-black text-slate-700">الوقت والتاريخ</th>
                      <th className="p-4 text-xs font-black text-slate-700 text-left">التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs
                      .filter((log) => log.actor_name.includes(searchQuery) || log.action.includes(searchQuery))
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4">
                            <span className="text-xs font-bold text-slate-950">{log.actor_name}</span>
                            {log.actor_id && <span className="text-[9px] text-slate-400 block font-mono">{log.actor_id}</span>}
                          </td>
                          <td className="p-4 text-xs">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-slate-100 border border-slate-200 text-slate-800">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-600">{log.target_entity}</td>
                          <td className="p-4 text-xs font-mono text-slate-500">{log.target_id || '-'}</td>
                          <td className="p-4 text-xs font-medium text-slate-500">
                            {new Date(log.created_at).toLocaleString('ar-EG')}
                          </td>
                          <td className="p-4 text-left">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedLog(log)}
                              className="text-[10px] py-1 h-auto cursor-pointer flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>استعراض القيم</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {!isLoading && activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">الإعدادات العامة وإعدادات الأمان</h1>
              <p className="text-xs text-slate-500 mt-1">تعديل بارامترات الأمان العامة ومراجعة حالة التفعيل</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <span>حالة خدمات Supabase و RLS</span>
                </CardTitle>
                <CardDescription>التواصل مع خادم كفراوي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 divide-y divide-slate-100">
                <div className="py-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">حالة قاعدة البيانات:</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    <span>متصل وبحالة ممتازة</span>
                  </span>
                </div>
                <div className="py-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">إلزامية RLS (Row Level Security):</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>مفعّل وصارم (Strict Mode)</span>
                  </span>
                </div>
                <div className="py-3 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">مفتاح خدمة الخدمة (Service Role Key):</span>
                  <span className="font-extrabold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    <span>مخفي / محمي بالكامل</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* CONFIRMATION MODAL */}
      <Modal
        isOpen={!!confirmModal?.isOpen}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.title || 'تأكيد العملية'}
        description={confirmModal?.desc || ''}
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => setConfirmModal(null)}
            className="cursor-pointer text-xs"
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button
            onClick={confirmModal?.action}
            className="bg-slate-900 hover:bg-slate-800 text-white cursor-pointer text-xs font-bold"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التنفيذ...</span>
              </span>
            ) : (
              'تأكيد وتنفيذ'
            )}
          </Button>
        </div>
      </Modal>

      {/* AUDIT LOG VALUE PREVIEW MODAL */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="تفاصيل الإجراء الإداري"
        description="استعراض قيم الحالة القديمة والجديدة المسجلة في قاعدة البيانات"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="font-bold text-slate-500 block mb-1">العملية:</span>
                <span className="font-mono font-black text-slate-900">{selectedLog.action}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150">
                <span className="font-bold text-slate-500 block mb-1">الكيان المستهدف:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLog.target_entity}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-rose-50/30 rounded-xl border border-rose-100">
                <span className="font-bold text-rose-800 block mb-2">القيمة السابقة (Old Value):</span>
                <pre className="font-mono text-[10px] whitespace-pre-wrap text-rose-900 bg-white p-2.5 rounded-lg border border-rose-100">
                  {JSON.stringify(selectedLog.old_value || {}, null, 2)}
                </pre>
              </div>

              <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-800 block mb-2">القيمة الجديدة (New Value):</span>
                <pre className="font-mono text-[10px] whitespace-pre-wrap text-emerald-900 bg-white p-2.5 rounded-lg border border-emerald-100">
                  {JSON.stringify(selectedLog.new_value || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button onClick={() => setSelectedLog(null)} className="bg-slate-900 hover:bg-slate-800 text-white cursor-pointer text-xs font-bold">
                إغلاق النافذة
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
