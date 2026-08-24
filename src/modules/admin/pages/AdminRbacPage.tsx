import React, { useEffect, useState, useCallback, useRef } from 'react';
import { roleService, SystemRole, SystemPermission, UserWithRoles } from '../../auth/services/roleService';
import { useAuth } from '../../../context/AuthContext';
import { AppRole, VerificationStatus } from '../../../types/auth';
import { adminApi, AdminMerchant, AdminProvider, AdminDriver, AdminOrder, AdminServiceRequest } from '../services/adminApi';
import { mobilityApi } from '../../customer/services/mobilityApi';
import { supabase } from '../../../lib/supabase';
import {
  LiveDriver,
  AdminRide,
  MobilityAdminStats,
  CashLedgerEntry,
  CustomerSummary,
  OperationsAlert,
  AdminAuditLog,
} from '../types';

// New Modular Admin Components
import { AdminHeader } from '../components/AdminHeader';
import { KpiCards } from '../components/KpiCards';
import { LiveOperationsRoom } from '../components/LiveOperationsRoom';
import { LiveDriversTable } from '../components/LiveDriversTable';
import { LiveRidesTable } from '../components/LiveRidesTable';
import { CashControlRoom } from '../components/CashControlRoom';
import { DriverApprovalQueue } from '../components/DriverApprovalQueue';
import { CustomerMonitorTable } from '../components/CustomerMonitorTable';
import { OperationsAlerts } from '../components/OperationsAlerts';
import { AuditLogsView } from '../components/AuditLogsView';
import { RideDetailsDrawer } from '../components/RideDetailsDrawer';
import { DriverProfileDrawer } from '../components/DriverProfileDrawer';

import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  Shield,
  ShieldCheck,
  Users,
  Key,
  CheckCircle2,
  AlertCircle,
  Search,
  Loader2,
  RefreshCw,
  Lock,
  Store,
  Wrench,
  Car,
  Briefcase,
  TrendingUp,
  ShoppingBag,
  FileText,
  Sliders,
  Settings,
  Activity,
  Banknote,
  Radio,
  Clock,
  ShieldAlert,
  Navigation,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'live_ops'
  | 'drivers'
  | 'rides'
  | 'cash_control'
  | 'driver_approvals'
  | 'alerts'
  | 'customers'
  | 'merchants'
  | 'providers'
  | 'users'
  | 'orders'
  | 'services'
  | 'roles'
  | 'audit'
  | 'settings';

export const AdminRbacPage: React.FC = () => {
  const { user: currentUser, refreshProfile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('live_ops');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Realtime & Health Connection State
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'polling' | 'disconnected'>('connected');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Mobility & Admin Live State
  const [mobilityStats, setMobilityStats] = useState<MobilityAdminStats>({
    onlineDrivers: 0,
    approvedDrivers: 0,
    pendingDrivers: 0,
    activeRides: 0,
    searchingRides: 0,
    completedToday: 0,
    cancelledToday: 0,
    cashCollectedToday: 0,
    platformCommissionToday: 0,
    driverNetToday: 0,
    pendingCashToday: 0,
    totalRidesToday: 0,
  });

  const [liveDrivers, setLiveDrivers] = useState<LiveDriver[]>([]);
  const [liveRides, setLiveRides] = useState<AdminRide[]>([]);
  const [cashLedger, setCashLedger] = useState<CashLedgerEntry[]>([]);
  const [operationsAlerts, setOperationsAlerts] = useState<OperationsAlert[]>([]);
  const [customersSummary, setCustomersSummary] = useState<CustomerSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Other Entities State (Marketplace & RBAC)
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [serviceRequests, setServiceRequests] = useState<AdminServiceRequest[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [rolePermMap, setRolePermMap] = useState<Record<string, Set<string>>>({});

  // Active Modals & Drawers
  const [selectedRide, setSelectedRide] = useState<AdminRide | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null);
  const [isRideDrawerOpen, setIsRideDrawerOpen] = useState(false);
  const [isDriverDrawerOpen, setIsDriverDrawerOpen] = useState(false);

  // Cash Confirmation Modal
  const [cashConfirmRide, setCashConfirmRide] = useState<AdminRide | null>(null);

  // General Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    action: () => Promise<void>;
  } | null>(null);

  const channelRef = useRef<any>(null);

  // Toast Helper
  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Main Live Data Loader
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // 1. Always load real live mobility stats, drivers, rides, alerts & ledger
      const [statsRes, driversRes, ridesRes, alertsRes, ledgerRes] = await Promise.all([
        adminApi.getAdminStats(),
        adminApi.getLiveDrivers(),
        adminApi.getLiveRides(100),
        adminApi.getOperationsAlerts(),
        adminApi.getCashLedger('all'),
      ]);

      setMobilityStats(statsRes);
      setLiveDrivers(driversRes);
      setLiveRides(ridesRes);
      setOperationsAlerts(alertsRes);
      setCashLedger(ledgerRes);
      setLastSyncTime(new Date());

      // 2. Load tab-specific auxiliary data
      if (activeTab === 'customers') {
        const custRes = await adminApi.getCustomersSummary();
        setCustomersSummary(custRes);
      } else if (activeTab === 'users') {
        const allUsers = await roleService.getAllUsersWithRoles();
        setUsers(allUsers);
      } else if (activeTab === 'merchants') {
        const allMerchants = await adminApi.getMerchants();
        setMerchants(allMerchants);
      } else if (activeTab === 'providers') {
        const allProviders = await adminApi.getProviders();
        setProviders(allProviders);
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
      console.error('[ADMIN LOAD DATA ERROR]', err);
      if (!isSilent) {
        showToast('error', err.message || 'حدث خطأ أثناء تحميل بيانات لوحة التحكم.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime Subscriptions with Fallback Polling
  useEffect(() => {
    let pollInterval: any = null;

    try {
      const channel = supabase
        .channel('admin_live_ops_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rides' },
          () => {
            loadData(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'drivers' },
          () => {
            loadData(true);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ride_location_updates' },
          () => {
            loadData(true);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeStatus('polling');
          }
        });

      channelRef.current = channel;
    } catch (e) {
      console.warn('Realtime subscription fallback to polling:', e);
      setRealtimeStatus('polling');
    }

    // Safety polling every 20 seconds
    pollInterval = setInterval(() => {
      loadData(true);
    }, 20000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (pollInterval) clearInterval(pollInterval);
    };
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
          عذراً، حسابك الحالي لا يملك صلاحيات الإدارة الكافية لاستعراض غرفة العمليات ولوحة تحكم المدير العام.
        </p>
        <span className="inline-flex items-center px-4 py-1.5 bg-rose-100 text-rose-800 text-sm font-bold rounded-full border border-rose-200">
          يتطلب دور: admin (is_admin = true)
        </span>
      </div>
    );
  }

  // --- ACTIONS ---

  // Handle Driver Status Update (Approved / Suspended / Rejected)
  const handleUpdateDriverStatus = async (driverId: string, status: VerificationStatus) => {
    try {
      await adminApi.updateDriverStatus(driverId, status);
      showToast('success', 'تم تحديث حالة الكابتن واعتمادها في قاعدة البيانات بنجاح.');
      await loadData(true);
      if (selectedDriver && selectedDriver.id === driverId) {
        setSelectedDriver({ ...selectedDriver, approval_status: status });
      }
    } catch (err: any) {
      console.error('[ADMIN DRIVER STATUS]', err);
      showToast('error', err.message || 'فشل تحديث حالة الكابتن.');
    }
  };

  // Handle Cash Payment Confirmation (15% Split / 85% Driver)
  const handleConfirmCashCollection = async (ride: AdminRide) => {
    const fare = ride.customer_total || ride.final_fare || ride.estimated_fare || 0;
    try {
      await adminApi.markCashPaymentReceived(ride.id);
      showToast('success', `تم تأكيد استلام ${fare} ج.م نقداً وتحديث دفتر الحسابات بنجاح.`);
      setCashConfirmRide(null);
      if (selectedRide && selectedRide.id === ride.id) {
        setSelectedRide({ ...selectedRide, payment_status: 'paid_cash' });
      }
      await loadData(true);
    } catch (err: any) {
      console.error('[MARK CASH COLLECTED]', err);
      showToast('error', err.message || 'فشل تسجيل استلام المبلغ نقداً.');
    }
  };

  // User Actions
  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    if (userId === currentUser?.id) {
      showToast('error', 'لا يمكنك تعطيل حسابك الشخصي الذي تستخدمه الآن!');
      return;
    }
    try {
      await roleService.toggleUserActiveStatus(userId, !currentActive);
      showToast('success', 'تم تحديث حالة الحساب بنجاح.');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'فشل تعديل حالة الحساب.');
    }
  };

  const handleToggleUserRole = async (userId: string, roleName: AppRole, hasRole: boolean) => {
    if (roleName === 'admin' && hasRole) {
      const adminUsers = users.filter((u) => u.roles.some((r) => r.name === 'admin'));
      if (adminUsers.length <= 1) {
        showToast('error', 'لا يمكن سحب دور المشرف؛ يجب أن يتبقى مشرف واحد على الأقل.');
        return;
      }
    }
    try {
      await roleService.toggleUserRole(userId, roleName, hasRole);
      showToast('success', 'تم تحديث أدوار المستخدم بنجاح.');
      loadData();
      if (userId === currentUser?.id) await refreshProfile();
    } catch (err: any) {
      showToast('error', err.message || 'فشل تحديث الدور.');
    }
  };

  // Select Driver Entity to Open Drawer
  const handleSelectDriver = (driver: LiveDriver) => {
    setSelectedDriver(driver);
    setIsDriverDrawerOpen(true);
  };

  const handleSelectDriverById = (driverId: string) => {
    const found = liveDrivers.find((d) => d.id === driverId);
    if (found) {
      setSelectedDriver(found);
      setIsDriverDrawerOpen(true);
    } else {
      showToast('error', 'تعذر العثور على بيانات هذا الكابتن.');
    }
  };

  // Select Ride Entity to Open Drawer
  const handleSelectRide = (ride: AdminRide) => {
    setSelectedRide(ride);
    setIsRideDrawerOpen(true);
  };

  const handleSelectRideById = (rideId: string) => {
    const found = liveRides.find((r) => r.id === rideId);
    if (found) {
      setSelectedRide(found);
      setIsRideDrawerOpen(true);
    } else {
      showToast('error', 'تعذر العثور على تفاصيل هذه الرحلة.');
    }
  };

  // Entity Selector from Alert Center
  const handleSelectEntityFromAlert = (type: 'ride' | 'driver', id: string) => {
    if (type === 'ride') {
      handleSelectRideById(id);
    } else if (type === 'driver') {
      handleSelectDriverById(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col lg:flex-row dir-rtl font-sans pb-12">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-white border-l border-slate-200 shrink-0 flex flex-col shadow-xs">
        {/* Brand */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white border border-emerald-500 shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Kafrawy Go Admin</h2>
            <p className="text-[11px] text-slate-500 font-medium">لوحة الإدارة وغرفة العمليات</p>
          </div>
        </div>

        {/* Manager Badge Card */}
        <div className="p-3.5 mx-3.5 my-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
          <Avatar name={currentUser?.full_name || 'مدير'} src={currentUser?.avatar_url || ''} size="md" />
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-slate-900 truncate">{currentUser?.full_name}</h4>
            <span className="text-[10px] inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
              <ShieldCheck className="w-3 h-3" />
              <span>مشرف عام معتمد</span>
            </span>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Section: Live Mobility Operations */}
          <div className="px-3 pt-2 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
            منظومة النقل والعمليات الحية
          </div>

          {[
            { id: 'live_ops', label: 'غرفة العمليات والخريطة', icon: Radio, count: mobilityStats.activeRides },
            { id: 'drivers', label: 'مراقبة الكباتن الحية', icon: Car, count: mobilityStats.onlineDrivers },
            { id: 'rides', label: 'سجل الرحلات المباشرة', icon: Activity, count: null },
            { id: 'cash_control', label: 'الرقابة المالية والتحصيل', icon: Banknote, count: null },
            { id: 'driver_approvals', label: 'تدقيق واعتماد الكباتن', icon: ShieldCheck, count: liveDrivers.filter((d) => d.approval_status === 'pending').length },
            { id: 'alerts', label: 'مركز التنبيهات والأعطال', icon: ShieldAlert, count: operationsAlerts.length, isDanger: operationsAlerts.length > 0 },
            { id: 'customers', label: 'سجل الركاب والعملاء', icon: Users, count: null },
          ].map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as AdminTab);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== null && item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      item.isDanger
                        ? 'bg-rose-500 text-white animate-pulse'
                        : isActive
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Section: Platform Management */}
          <div className="px-3 pt-4 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
            إدارة المنصة والسوق
          </div>

          {[
            { id: 'dashboard', label: 'الإحصائيات ونظرة عامة', icon: TrendingUp },
            { id: 'merchants', label: 'المتاجر والتجار', icon: Store },
            { id: 'providers', label: 'مقدمو الخدمات والصيانة', icon: Wrench },
            { id: 'orders', label: 'طلبات المتجر', icon: ShoppingBag },
            { id: 'services', label: 'طلبات الخدمات', icon: Sliders },
            { id: 'users', label: 'المستخدمون والأدوار', icon: Users },
            { id: 'roles', label: 'مصفوفة الصلاحيات (RBAC)', icon: Key },
            { id: 'audit', label: 'سجل العمليات Audit Logs', icon: FileText },
          ].map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as AdminTab);
                  setSearchQuery('');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        {/* Admin Header with Connection & Alerts Indicators */}
        <AdminHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          alertCount={operationsAlerts.length}
          realtimeStatus={realtimeStatus}
          onRefresh={() => loadData(false)}
          isRefreshing={isRefreshing}
          lastSyncTime={lastSyncTime}
        />

        {/* Global Toast Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 animate-slide-in shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <p className="text-xs font-bold">{statusMessage.text}</p>
          </div>
        )}

        {/* Top KPI Cards (Show on Live Ops and Dashboard) */}
        {(activeTab === 'live_ops' || activeTab === 'dashboard') && (
          <KpiCards mobility={mobilityStats} onCardClick={setActiveTab} />
        )}

        {/* Loading Spinner Skeleton */}
        {isLoading && !isRefreshing && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs text-slate-500 font-bold">جارِ مزامنة بيانات غرفة العمليات...</p>
          </div>
        )}

        {/* TAB 1: LIVE OPERATIONS ROOM (MAP + DISPATCH FEED) */}
        {!isLoading && activeTab === 'live_ops' && (
          <LiveOperationsRoom
            drivers={liveDrivers}
            rides={liveRides}
            alerts={operationsAlerts}
            onSelectDriver={handleSelectDriver}
            onSelectRide={handleSelectRide}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* TAB 2: LIVE DRIVERS MONITOR */}
        {!isLoading && activeTab === 'drivers' && (
          <LiveDriversTable
            drivers={liveDrivers}
            onSelectDriver={handleSelectDriver}
            onOpenApprovalQueue={() => setActiveTab('driver_approvals')}
          />
        )}

        {/* TAB 3: LIVE RIDES TABLE */}
        {!isLoading && activeTab === 'rides' && (
          <LiveRidesTable
            rides={liveRides}
            onSelectRide={handleSelectRide}
            onConfirmCashPayment={(ride) => setCashConfirmRide(ride)}
          />
        )}

        {/* TAB 4: CASH CONTROL ROOM */}
        {!isLoading && activeTab === 'cash_control' && (
          <CashControlRoom
            mobilityStats={mobilityStats}
            cashLedger={cashLedger}
            onSelectDriverById={handleSelectDriverById}
            onRefresh={() => loadData(false)}
          />
        )}

        {/* TAB 5: DRIVER APPROVAL QUEUE */}
        {!isLoading && activeTab === 'driver_approvals' && (
          <DriverApprovalQueue
            drivers={liveDrivers}
            onUpdateDriverStatus={handleUpdateDriverStatus}
            onSelectDriver={handleSelectDriver}
            isLoading={isLoading}
          />
        )}

        {/* TAB 6: OPERATIONS ALERTS CENTER */}
        {!isLoading && activeTab === 'alerts' && (
          <OperationsAlerts
            alerts={operationsAlerts}
            onSelectEntity={handleSelectEntityFromAlert}
            onRefresh={() => loadData(false)}
          />
        )}

        {/* TAB 7: CUSTOMERS MONITOR */}
        {!isLoading && activeTab === 'customers' && (
          <CustomerMonitorTable customers={customersSummary} />
        )}

        {/* TAB 8: AUDIT LOGS VIEW */}
        {!isLoading && activeTab === 'audit' && (
          <AuditLogsView logs={auditLogs} />
        )}

        {/* TAB 9: USERS & RBAC */}
        {!isLoading && activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">إدارة حسابات المستخدمين والمهام</h2>
                <p className="text-xs text-slate-500">تنشيط الحسابات، إدارة الأدوار (Roles)، والتحقق من RLS.</p>
              </div>
              <Badge className="bg-slate-100 text-slate-700">{users.length} مستخدم</Badge>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="p-3 px-4">المستخدم</th>
                      <th className="p-3 px-4">رقم الهاتف</th>
                      <th className="p-3 px-4">الحالة</th>
                      <th className="p-3 px-4">الأدوار الممنوحة</th>
                      <th className="p-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 px-4 font-bold text-slate-900">{u.full_name}</td>
                        <td className="p-3 px-4 font-mono text-slate-600">{u.phone_number || 'بدون هاتف'}</td>
                        <td className="p-3 px-4">
                          {u.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800">نشط</Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-800">معطل</Badge>
                          )}
                        </td>
                        <td className="p-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span key={r.id} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {r.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleUserActive(u.id, u.is_active)}
                              className="h-7 text-[11px]"
                            >
                              {u.is_active ? 'تعطيل' : 'تنشيط'}
                            </Button>
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
                              className="h-7 text-[11px]"
                            >
                              {u.roles.some((r) => r.name === 'admin') ? 'سحب الإدارة' : 'ترقية لإداري'}
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

        {/* TAB 10: MERCHANTS */}
        {!isLoading && activeTab === 'merchants' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">إدارة التجار والمتاجر</h2>
                <p className="text-xs text-slate-500">مراجعة طلبات الانضمام والاعتماد التجاري.</p>
              </div>
              <Badge className="bg-slate-100 text-slate-700">{merchants.length} متجر</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {merchants.map((m) => (
                <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{m.store_name}</h3>
                    <Badge className={m.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                      {m.approval_status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <div>المالك: <span className="font-bold">{m.owner_name}</span> ({m.owner_phone})</div>
                    <div>التقييم: ⭐ {m.rating_average.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 11: PROVIDERS */}
        {!isLoading && activeTab === 'providers' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">إدارة مقدمي الخدمات والصيانة</h2>
                <p className="text-xs text-slate-500">مراجعة الحرفيين والمهنيين المعتمدين.</p>
              </div>
              <Badge className="bg-slate-100 text-slate-700">{providers.length} مقدم خدمة</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((p) => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">{p.provider_name}</h3>
                    <Badge className={p.verification_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                      {p.verification_status === 'approved' ? 'معتمد' : 'قيد المراجعة'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600">
                    <div>الهاتف: {p.provider_phone}</div>
                    <div>المهام المنجزة: {p.jobs_completed_count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 12: GENERAL OVERVIEW / DASHBOARD */}
        {!isLoading && activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">نظام كفراوي جو الموحد</h2>
                <p className="text-xs text-slate-500 mt-1">
                  المنظومة مؤمنة بسياسات RLS وقواعد أمان PostgreSQL. كافة البيانات متزامنة لحظياً عبر Realtime.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RIDE DETAILS DRAWER */}
      <RideDetailsDrawer
        ride={selectedRide}
        isOpen={isRideDrawerOpen}
        onClose={() => {
          setIsRideDrawerOpen(false);
          setSelectedRide(null);
        }}
        onConfirmCashPayment={(ride) => {
          setIsRideDrawerOpen(false);
          setCashConfirmRide(ride);
        }}
      />

      {/* DRIVER PROFILE DRAWER */}
      <DriverProfileDrawer
        driver={selectedDriver}
        isOpen={isDriverDrawerOpen}
        onClose={() => {
          setIsDriverDrawerOpen(false);
          setSelectedDriver(null);
        }}
        onUpdateStatus={handleUpdateDriverStatus}
        onViewActiveRide={handleSelectRideById}
      />

      {/* CASH PAYMENT CONFIRMATION MODAL */}
      {cashConfirmRide && (
        <div className="fixed inset-0 z-50 overflow-y-auto dir-rtl flex items-center justify-center p-4">
          <div
            onClick={() => setCashConfirmRide(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-800">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تأكيد تحصيل الأجرة نقداً</h3>
                <p className="text-xs text-slate-500">
                  طلب رحلة #{cashConfirmRide.id.substring(0, 8)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-600">إجمالي الأجرة المطلوب تحصيلها:</span>
                <span className="text-slate-900 text-sm">
                  {cashConfirmRide.customer_total || cashConfirmRide.final_fare || cashConfirmRide.estimated_fare} ج.م
                </span>
              </div>
              <div className="flex items-center justify-between text-indigo-700">
                <span>عمولة المنصة المقتطعة (15%):</span>
                <span className="font-bold">
                  {cashConfirmRide.platform_commission || Math.round((cashConfirmRide.customer_total || 0) * 0.15 * 100) / 100} ج.م
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span>صافي مستحقات الكابتن (85%):</span>
                <span className="font-bold">
                  {cashConfirmRide.driver_earning || Math.round((cashConfirmRide.customer_total || 0) * 0.85 * 100) / 100} ج.م
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              عند التأكيد، سيتم استدعاء RPC الآمن (<code className="font-mono text-emerald-700 font-bold">mark_cash_payment_received</code>) وتحديث حالة الرحلة إلى <span className="font-bold text-emerald-700">paid_cash</span> وتسجيل العملية في سجلات الأمان.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCashConfirmRide(null)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => handleConfirmCashCollection(cashConfirmRide)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                تأكيد الاستلام والتسجيل
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminRbacPage;
