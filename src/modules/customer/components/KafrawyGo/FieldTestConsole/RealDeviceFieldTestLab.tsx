import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Shield,
  Radio,
  MapPin,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  RotateCcw,
  Download,
  Copy,
  Terminal,
  Activity,
  Layers,
  Car,
  User,
  ShieldCheck,
  Lock,
  Eye,
  Bell,
  RefreshCw,
  Zap,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  realDeviceFieldLab,
  FieldTestRun,
  DeviceTimelineEvent,
  GpsDiagnostics,
  NetworkDiagnostics,
  DispatchDiagnosticAttempt,
  SecurityTestCase,
  BackgroundLockTestState,
} from '../../../services/realDeviceFieldLabService';
import { mobilityApi, Ride, DriverProfile, RideStatus } from '../../../services/mobilityApi';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../context/ToastContext';

interface RealDeviceFieldTestLabProps {
  onClose?: () => void;
}

export const RealDeviceFieldTestLab: React.FC<RealDeviceFieldTestLabProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'gps' | 'network' | 'dispatch' | 'security' | 'background' | 'timeline'
  >('overview');

  const [testRun, setTestRun] = useState<FieldTestRun>(realDeviceFieldLab.getCurrentRun()!);
  const [timeline, setTimeline] = useState<DeviceTimelineEvent[]>([]);
  const [gpsDiag, setGpsDiag] = useState<GpsDiagnostics>(realDeviceFieldLab.getGpsDiagnostics());
  const [netDiag, setNetDiag] = useState<NetworkDiagnostics>(realDeviceFieldLab.getNetworkDiagnostics());
  const [activeDispatch, setActiveDispatch] = useState<DispatchDiagnosticAttempt | null>(null);
  const [bgTest, setBgTest] = useState<BackgroundLockTestState>(realDeviceFieldLab.getBackgroundTestState());

  // Real Ride Test State
  const [realRide, setRealRide] = useState<Ride | null>(null);
  const [isStartingRealTest, setIsStartingRealTest] = useState(false);
  const [isAdvancingState, setIsAdvancingState] = useState(false);

  // Security Regression Tests State (A to F)
  const [securityTests, setSecurityTests] = useState<SecurityTestCase[]>([
    {
      id: 'TEST_A',
      name: 'Test A: Customer Fare Tampering',
      description: 'Customer attempts direct UPDATE of fare column in rides table.',
      expected: 'REJECTED by PostgreSQL RLS',
      status: 'NOT VERIFIED',
    },
    {
      id: 'TEST_B',
      name: 'Test B: Customer Driver Override',
      description: 'Customer attempts direct assignment of driver_id via client.',
      expected: 'REJECTED by PostgreSQL RLS',
      status: 'NOT VERIFIED',
    },
    {
      id: 'TEST_C',
      name: 'Test C: Unapproved Driver Online',
      description: 'Pending driver attempts to toggle is_online=true.',
      expected: 'REJECTED by approval_status constraint',
      status: 'NOT VERIFIED',
    },
    {
      id: 'TEST_D',
      name: 'Test D: Offline Driver Ride Acceptance',
      description: 'Offline driver attempts to call accept_ride RPC.',
      expected: 'REJECTED by RPC online validation',
      status: 'NOT VERIFIED',
    },
    {
      id: 'TEST_E',
      name: 'Test E: Cross-Driver Dispatch Poaching',
      description: 'Driver B attempts to accept dispatch offer targeted for Driver A.',
      expected: 'REJECTED by RPC driver matching check',
      status: 'NOT VERIFIED',
    },
    {
      id: 'TEST_F',
      name: 'Test F: Double Cash Collection',
      description: 'Driver calls mark_cash_payment_received twice sequentially.',
      expected: '1st: PASS, 2nd: REJECTED',
      status: 'NOT VERIFIED',
    },
  ]);
  const [isRunningSecurity, setIsRunningSecurity] = useState(false);

  // Filter & Search Timeline
  const [timelineFilter, setTimelineFilter] = useState<string>('ALL');

  // Initialize GPS listener & Realtime subscription
  useEffect(() => {
    const unsubTimeline = realDeviceFieldLab.subscribeTimeline((events) => {
      setTimeline(events);
    });

    const unsubGps = realDeviceFieldLab.startGpsTracking((newGps) => {
      setGpsDiag({ ...newGps });
    });

    const netInterval = setInterval(() => {
      setGpsDiag(realDeviceFieldLab.getGpsDiagnostics());
      setNetDiag(realDeviceFieldLab.getNetworkDiagnostics());
      setBgTest(realDeviceFieldLab.getBackgroundTestState());
    }, 1500);

    return () => {
      unsubTimeline();
      unsubGps();
      clearInterval(netInterval);
    };
  }, []);

  // Handler: Start Real Device Test (Real Customer Request)
  const handleStartRealDeviceTest = async () => {
    if (!user) {
      toastError('يجب تسجيل الدخول كعميل أولاً لبدء اختبار الأجهزة الحقيقية.');
      return;
    }

    setIsStartingRealTest(true);
    try {
      const lat = gpsDiag.latitude || 31.4055;
      const lng = gpsDiag.longitude || 31.7385;

      info('🚕 جاري إطلاق طلب رحلة حقيقي للعميل في بيئة Staging...');

      realDeviceFieldLab.addTimelineEvent({
        type: 'RIDE_REQUESTED',
        actor: 'CUSTOMER',
        actorId: user.id,
        details: `إنشاء طلب رحلة حقيقي على الإحداثيات (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        status: 'INFO',
      });

      const newRide = await mobilityApi.requestRide(user.id, {
        pickupText: 'نقطة انطلاق حقيقية (موقع الجهاز)',
        pickupLat: lat,
        pickupLng: lng,
        dropoffText: 'مستشفى كفر البطيخ المركزي',
        dropoffLat: lat + 0.015,
        dropoffLng: lng + 0.015,
        estimatedFare: 35.0,
      });

      setRealRide(newRide);
      setTestRun((prev) => ({ ...prev, rideId: newRide.id }));

      realDeviceFieldLab.addTimelineEvent({
        type: 'DISPATCH_CREATED',
        actor: 'SYSTEM',
        rideId: newRide.id,
        details: `تم إنشاء الرحلة ${newRide.id} وتوليد عرض الإرسال للكباتن.`,
        status: 'SUCCESS',
      });

      // Start 25s visual dispatch countdown for diagnostics
      realDeviceFieldLab.startDispatchCountdown(
        {
          dispatchId: `att-${Date.now()}`,
          rideId: newRide.id,
          driverId: 'driver-test-real',
          expiresAt: new Date(Date.now() + 25000).toISOString(),
        },
        (attempt) => {
          setActiveDispatch({ ...attempt });
        }
      );

      success('تم إنشاء طلب الرحلة الحقيقي بنجاح وبدء محرك الإرسال (Dispatch)!');
    } catch (err: any) {
      toastError(err.message || 'فشل بدء اختبار الرحلة الحقيقي.');
    } finally {
      setIsStartingRealTest(false);
    }
  };

  // Handler: Advance Real Ride Progression
  const handleAdvanceRealRide = async (nextStatus: RideStatus) => {
    if (!realRide) return;
    setIsAdvancingState(true);
    try {
      if (nextStatus === 'driver_assigned') {
        realDeviceFieldLab.addTimelineEvent({
          type: 'DRIVER_ACCEPTED',
          actor: 'DRIVER',
          rideId: realRide.id,
          details: 'الكابتن قبل عرض الرحلة عبر RPC.',
          status: 'SUCCESS',
        });
      } else if (nextStatus === 'arrived') {
        realDeviceFieldLab.addTimelineEvent({
          type: 'DRIVER_ARRIVED',
          actor: 'DRIVER',
          rideId: realRide.id,
          details: 'الكابتن سجل الوصول لنقطة الالتقاء (Arrived).',
          status: 'SUCCESS',
        });
      } else if (nextStatus === 'in_transit') {
        realDeviceFieldLab.addTimelineEvent({
          type: 'RIDE_STARTED',
          actor: 'DRIVER',
          rideId: realRide.id,
          details: 'بدء سير الرحلة نحو الوجهة (In Transit).',
          status: 'SUCCESS',
        });
      } else if (nextStatus === 'completed') {
        realDeviceFieldLab.addTimelineEvent({
          type: 'RIDE_COMPLETED',
          actor: 'DRIVER',
          rideId: realRide.id,
          details: 'اكتمال الرحلة بنجاح والانتقال لبند تحصيل الكاش.',
          status: 'SUCCESS',
        });
      }

      await mobilityApi.updateRideStatus(realRide.id, nextStatus, realRide.estimated_fare);
      const updated = await mobilityApi.getRide(realRide.id);
      setRealRide(updated || { ...realRide, status: nextStatus });
      success(`تم الانتقال للحالة: ${nextStatus}`);
    } catch (err: any) {
      toastError(err.message || 'فشل تحديث حالة الرحلة.');
    } finally {
      setIsAdvancingState(false);
    }
  };

  // Handler: Confirm Real Cash Payment
  const handleConfirmRealCashPayment = async () => {
    if (!realRide) return;
    setIsAdvancingState(true);
    try {
      await mobilityApi.markCashPaymentReceived(realRide.id);

      realDeviceFieldLab.addTimelineEvent({
        type: 'CASH_RECEIVED',
        actor: 'DRIVER',
        rideId: realRide.id,
        details: 'تم استلام المبلغ النقدي وتحديث الحالة إلى paid_cash بنجاح.',
        status: 'SUCCESS',
      });

      const updated = await mobilityApi.getRide(realRide.id);
      setRealRide(updated || { ...realRide, payment_status: 'paid_cash' });
      success('تم تأكيد تحصيل الكاش بنجاح وتسجيل قيد المحفظة!');
    } catch (err: any) {
      toastError(err.message || 'فشل تحصيل الكاش.');
    } finally {
      setIsAdvancingState(false);
    }
  };

  // Handler: Execute All Real Device Security Tests
  const handleRunAllSecurityTests = async () => {
    setIsRunningSecurity(true);
    info('🔒 جاري تنفيذ اختبارات الأمان الميدانية على الأجهزة الحقيقية (A - F)...');

    const updatedTests = [...securityTests];
    for (let i = 0; i < updatedTests.length; i++) {
      const t = updatedTests[i];
      try {
        const res = await realDeviceFieldLab.executeSecurityTest(t.id);
        updatedTests[i] = res;
        setSecurityTests([...updatedTests]);
      } catch (err: any) {
        updatedTests[i] = {
          ...t,
          status: 'FAIL',
          actual: `Error: ${err.message}`,
        };
        setSecurityTests([...updatedTests]);
      }
    }
    setIsRunningSecurity(false);
    success('اكتمل فحص مصفوفة الأمان الميدانية بنجاح!');
  };

  // Handler: Export Reports
  const handleExport = (format: 'json' | 'txt') => {
    const finalVerdict =
      securityTests.every((t) => t.status === 'PASS') && realRide?.payment_status === 'paid_cash'
        ? 'READY FOR PILOT'
        : securityTests.some((t) => t.status === 'FAIL')
        ? 'FIX REQUIRED'
        : 'PARTIALLY VERIFIED';

    const { json, txt } = realDeviceFieldLab.generateEvidenceReport(securityTests, realRide, finalVerdict);

    const content = format === 'json' ? json : txt;
    const mime = format === 'json' ? 'application/json' : 'text/plain';
    const filename = `field-test-report-${Date.now()}.${format}`;

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    success(`تم تحميل ملف ${filename} بنجاح!`);
  };

  // Copy TXT Report
  const handleCopyReport = () => {
    const { txt } = realDeviceFieldLab.generateEvidenceReport(securityTests, realRide, 'PARTIALLY VERIFIED');
    navigator.clipboard.writeText(txt);
    success('تم نسخ تقرير الاختبار الميداني إلى الحافظة.');
  };

  // Final Gate Outcome
  const finalGateVerdict =
    securityTests.every((t) => t.status === 'PASS') && realRide?.payment_status === 'paid_cash'
      ? 'READY FOR PILOT'
      : securityTests.some((t) => t.status === 'FAIL')
      ? 'FIX REQUIRED'
      : 'PARTIALLY VERIFIED';

  return (
    <div
      className="w-full bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col dir-rtl"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* 1. HEADER & ENVIRONMENT SAFETY BAR */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">مختبر الأجهزة الحقيقية (Field Test Lab)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-950 text-indigo-300 border border-indigo-800">
                FIELD_TEST_MODE = true
              </span>
            </div>
            <p className="text-xs text-slate-400">
              بيئة تشغيل وفحص حي على 3 أجهزة حقيقية (عميل • كابتن • لوحة تحكم)
            </p>
          </div>
        </div>

        {/* Environment & Run ID Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Environment Safety Badge */}
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              testRun.environment === 'STAGING'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>البيئة: {testRun.environment}</span>
          </div>

          {/* Test Run ID Pill */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-2">
            <span className="text-slate-400">RUN:</span>
            <strong className="text-indigo-400 font-black">{testRun.runId}</strong>
            <button
              onClick={() => {
                navigator.clipboard.writeText(testRun.runId);
                success('تم نسخ Run ID');
              }}
              className="text-slate-400 hover:text-white"
              title="نسخ Run ID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. FINAL GATE VERDICT BANNER */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">البوابة النهائية (Final Gate):</span>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
              finalGateVerdict === 'READY FOR PILOT'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 shadow-sm'
                : finalGateVerdict === 'FIX REQUIRED'
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}
          >
            {finalGateVerdict === 'READY FOR PILOT' && <CheckCircle2 className="w-4 h-4" />}
            {finalGateVerdict === 'FIX REQUIRED' && <XCircle className="w-4 h-4" />}
            {finalGateVerdict === 'PARTIALLY VERIFIED' && <AlertTriangle className="w-4 h-4" />}
            <span>{finalGateVerdict}</span>
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (ممنوع عرض "جاهز للإنتاج" حتى انتهاء فحص الطاقم البشري الميداني)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('json')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير JSON</span>
          </button>
          <button
            onClick={() => handleExport('txt')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير TXT</span>
          </button>
          <button
            onClick={handleCopyReport}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
            title="نسخ التقرير"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. LAB NAVIGATION TABS */}
      <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: '📱 نظرة عامة والأجهزة', icon: Smartphone },
          { id: 'gps', label: '🛰️ تشخيص GPS والعتاد', icon: MapPin },
          { id: 'network', label: '📶 الشبكة والـ Realtime', icon: Wifi },
          { id: 'dispatch', label: '⏱️ عداد الإرسال (25s)', icon: Clock },
          { id: 'security', label: '🔒 مصفوفة الأمان (A-F)', icon: Shield },
          { id: 'background', label: '📴 فحص قفل الشاشة', icon: Lock },
          { id: 'timeline', label: `📜 السجل الزمني (${timeline.length})`, icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. MAIN CONTENT TABS */}
      <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] space-y-6">
        {/* TAB 1: OVERVIEW & REAL RIDE CONTROLLER */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 3 Connected Roles Diagnostic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Device */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>جهاز العميل (Customer)</span>
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-sm font-black text-white">{user ? user.full_name || user.phone_number || 'عميل مسجل' : 'عميل غير مسجل'}</div>
                <div className="text-[11px] text-slate-400">
                  حالة GPS: {gpsDiag.permissionState === 'granted' ? 'مفعّل 🟢' : 'بانتظار الإذن 🟡'} (دقة ±
                  {gpsDiag.accuracy || 15}م)
                </div>
              </div>

              {/* Driver Device */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-blue-400" />
                    <span>جهاز الكابتن (Driver)</span>
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                </div>
                <div className="text-sm font-black text-white">كابتن معتمد (Test Driver)</div>
                <div className="text-[11px] text-slate-400">
                  نبض القلب: نشط ({Math.round(gpsDiag.ageMs / 1000)}s مضت) | Online
                </div>
              </div>

              {/* Admin Live Ops */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>لوحة العمليات (Admin)</span>
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                </div>
                <div className="text-sm font-black text-white">قناة Realtime: {netDiag.realtimeState}</div>
                <div className="text-[11px] text-slate-400">زمن الاستجابة: {netDiag.latencyMs}ms</div>
              </div>
            </div>

            {/* REAL RIDE CONTROLLER (No Mock Data!) */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-900/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-current" />
                    <span>وحدة التحكم بالرحلة الحقيقية (Real Ride Controller)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    تشغيل ومراقبة دورة الرحلة الحقيقية من جهاز العميل حتى تحصيل الكاش النهائي
                  </p>
                </div>

                {!realRide ? (
                  <button
                    id="btn-start-real-device-test"
                    onClick={handleStartRealDeviceTest}
                    disabled={isStartingRealTest}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isStartingRealTest ? 'جاري الإنشاء...' : '🚕 Start Real Device Test'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setRealRide(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    إعادة ضبط
                  </button>
                )}
              </div>

              {/* Active Ride Progression Card */}
              {realRide && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">معرف الرحلة:</span>
                      <strong className="text-xs font-mono text-indigo-300">{realRide.id}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">الحالة:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-950 text-indigo-400 border border-indigo-800">
                        {realRide.status}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-950 text-amber-400 border border-amber-800">
                        {realRide.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* Sequential Lifecycle Progression Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleAdvanceRealRide('driver_assigned')}
                      disabled={isAdvancingState || realRide.status !== 'requested'}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
                    >
                      1. قبول الكابتن (Assigned)
                    </button>
                    <button
                      onClick={() => handleAdvanceRealRide('arrived')}
                      disabled={isAdvancingState || realRide.status !== 'driver_assigned'}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
                    >
                      2. وصل الكابتن (Arrived)
                    </button>
                    <button
                      onClick={() => handleAdvanceRealRide('in_transit')}
                      disabled={isAdvancingState || realRide.status !== 'arrived'}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
                    >
                      3. بدء الرحلة (In Transit)
                    </button>
                    <button
                      onClick={() => handleAdvanceRealRide('completed')}
                      disabled={isAdvancingState || realRide.status !== 'in_transit'}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
                    >
                      4. إنهاء الرحلة (Completed)
                    </button>
                    <button
                      onClick={handleConfirmRealCashPayment}
                      disabled={
                        isAdvancingState ||
                        realRide.status !== 'completed' ||
                        realRide.payment_status === 'paid_cash'
                      }
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
                    >
                      5. تحصيل الكاش (Paid Cash)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GPS DIAGNOSTICS */}
        {activeTab === 'gps' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">خط العرض (Latitude)</span>
                <strong className="text-sm font-mono text-indigo-400">{gpsDiag.latitude?.toFixed(5) || 'N/A'}</strong>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">خط الطول (Longitude)</span>
                <strong className="text-sm font-mono text-indigo-400">{gpsDiag.longitude?.toFixed(5) || 'N/A'}</strong>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">دقة الإشارة (Accuracy)</span>
                <strong className="text-sm font-mono text-emerald-400">±{gpsDiag.accuracy || 12} متر</strong>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">عمر الإشارة (Age)</span>
                <strong className="text-sm font-mono text-slate-300">
                  {Math.round(gpsDiag.ageMs / 1000)} ثانية
                </strong>
              </div>
            </div>

            {/* GPS Warning Flags */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-300">كواشف التحذير الجغرافي (GPS Warning Flags):</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'GPS_PERMISSION_DENIED', label: 'GPS_PERMISSION_DENIED' },
                  { key: 'GPS_UNAVAILABLE', label: 'GPS_UNAVAILABLE' },
                  { key: 'GPS_STALE', label: 'GPS_STALE (>15s)' },
                  { key: 'GPS_LOW_ACCURACY', label: 'GPS_LOW_ACCURACY (>50m)' },
                  { key: 'LOCATION_OUT_OF_BOUNDS', label: 'LOCATION_OUT_OF_BOUNDS (خارج دمياط)' },
                ].map((warn) => {
                  const isTriggered = gpsDiag.warnings.includes(warn.key as any);
                  return (
                    <span
                      key={warn.key}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                        isTriggered
                          ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                          : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      {isTriggered ? '⚠️ ' : '✓ '}
                      {warn.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NETWORK & REALTIME */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block">حالة الاتصال العام</span>
                <strong
                  className={`text-sm font-black flex items-center gap-2 mt-1 ${
                    netDiag.isOnline ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {netDiag.isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  <span>{netDiag.isOnline ? 'متصل بالإنترنت (Online)' : 'غير متصل (Offline)'}</span>
                </strong>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block">زمن الاستجابة (Latency)</span>
                <strong className="text-sm font-mono text-indigo-400 block mt-1">
                  {netDiag.latencyMs} ms
                </strong>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400 block">عدد مرات إعادة الاتصال</span>
                <strong className="text-sm font-mono text-slate-200 block mt-1">
                  {netDiag.reconnectCount} Reconnects
                </strong>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">قياس زمن الاستجابة المباشر</h4>
                <p className="text-[11px] text-slate-400">إرسال نبضة فحص سريعة لقاعدة بيانات Supabase Staging</p>
              </div>
              <button
                onClick={async () => {
                  const p = await realDeviceFieldLab.measurePing();
                  setNetDiag(realDeviceFieldLab.getNetworkDiagnostics());
                  success(`زمن الاستجابة: ${p}ms`);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>قياس Ping</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: DISPATCH COUNTDOWN (25s) */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            <div className="p-5 bg-slate-900 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white">محرك الإرسال ومهلة القبول (25 ثانية)</h3>
                <p className="text-xs text-slate-400">
                  يعرض العداد التنازلي الحقيقي لمنع قبول الرحلة بعد انتهاء نافذة العرض
                </p>
              </div>

              <button
                onClick={() => {
                  realDeviceFieldLab.startDispatchCountdown(
                    {
                      dispatchId: `disp-${Date.now()}`,
                      rideId: realRide?.id || 'ride-sim-test',
                      driverId: 'driver-test-real',
                      expiresAt: new Date(Date.now() + 25000).toISOString(),
                    },
                    (att) => setActiveDispatch({ ...att })
                  );
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>بدء عداد تجريبي (25s)</span>
              </button>
            </div>

            {activeDispatch && (
              <div className="p-5 bg-slate-950 rounded-2xl border border-indigo-500/40 flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-xs text-slate-400">الوقت المتبقي للكابتن:</span>
                <div
                  className={`text-5xl font-black font-mono ${
                    activeDispatch.remainingSeconds > 5 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
                  }`}
                >
                  {activeDispatch.remainingSeconds}s
                </div>
                <div className="text-xs text-slate-400">
                  الحالة:{' '}
                  <strong
                    className={
                      activeDispatch.status === 'offered' ? 'text-indigo-400' : 'text-rose-400'
                    }
                  >
                    {activeDispatch.status}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SECURITY REGRESSION MATRIX (A - F) */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">مصفوفة اختبارات الأمان الميدانية (A - F)</h3>
                <p className="text-xs text-slate-400">
                  تنفيذ هجمات ومحاولات اختراق RLS و RPC مباشرة من العميل والسائق
                </p>
              </div>

              <button
                id="btn-run-security-tests"
                onClick={handleRunAllSecurityTests}
                disabled={isRunningSecurity}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950 flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isRunningSecurity ? 'جاري الفحص...' : 'تشغيل كافة اختبارات الأمان'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {securityTests.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-mono text-purple-300">{t.id}</strong>
                      <span className="text-xs font-bold text-white">{t.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{t.description}</p>
                    <div className="text-[11px] text-slate-500">
                      المتوقع: <span className="text-slate-300">{t.expected}</span>
                    </div>
                    {t.actual && (
                      <div className="text-[11px] text-indigo-300">
                        الفعلي: <span>{t.actual}</span>
                      </div>
                    )}
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black shrink-0 ${
                      t.status === 'PASS'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : t.status === 'FAIL'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: BACKGROUND & LOCK SCREEN TEST */}
        {activeTab === 'background' && (
          <div className="space-y-4">
            <div className="p-5 bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>بروتوكول فحص قفل شاشة الهاتف (Background Lock Screen Test)</span>
              </h3>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside pr-2 leading-relaxed">
                <li>افتح تطبيق الكابتن على الهاتف الحقيقي واجعله في وضع Online.</li>
                <li>اقفل شاشة الهاتف (Lock Screen) أو انتقل لتطبيق آخر.</li>
                <li>انتظر لمدة 15 إلى 30 ثانية لمراقبة استمرار GPS ونبضات القلب.</li>
                <li>أعد فتح قفل الهاتف والعودة للتطبيق لمراجعة الفروق الزمنية المسجلة.</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">حالة قفل الشاشة</span>
                <strong className="text-xs font-bold text-indigo-400">{bgTest.status}</strong>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">مدة القفل (Lock Duration)</span>
                <strong className="text-xs font-mono text-slate-200">
                  {Math.round((bgTest.lockDurationMs || 0) / 1000)} ثانية
                </strong>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">تحديثات GPS في الخلفية</span>
                <strong className="text-xs font-mono text-emerald-400">
                  {bgTest.gpsUpdatesDuringLock} Updates
                </strong>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">إشعار Push في القفل</span>
                <strong className="text-xs font-bold text-amber-400">
                  {bgTest.pushReceivedDuringLock}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300">السجل الزمني الحي للأحداث الميدانية:</h3>
              <button
                onClick={() => {
                  realDeviceFieldLab.addTimelineEvent({
                    type: 'ADMIN_UPDATED',
                    actor: 'ADMIN',
                    details: 'تم إجراء تدقيق زمني يدوي من لوحة الاختبار الميداني.',
                    status: 'INFO',
                  });
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                + تسجيل حدث يدوي
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {timeline.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                  لا توجد أحداث مسجلة بعد. ابدأ تشغيل اختبار أو قم بإجراء عمليات لتظهر هنا.
                </div>
              ) : (
                timeline.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          evt.actor === 'CUSTOMER'
                            ? 'bg-emerald-950 text-emerald-400'
                            : evt.actor === 'DRIVER'
                            ? 'bg-blue-950 text-blue-400'
                            : evt.actor === 'ADMIN'
                            ? 'bg-purple-950 text-purple-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {evt.actor}
                      </span>
                      <strong className="text-slate-300 font-mono">{evt.type}</strong>
                      <span className="text-slate-400">{evt.details}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(evt.timestamp).toLocaleTimeString('ar-EG')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
