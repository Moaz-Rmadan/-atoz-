import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RotateCcw,
  Square,
  Copy,
  Download,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Terminal,
  Shield,
  Radio,
  MapPin,
  Wifi,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Zap,
  Filter,
  Layers,
  X
} from 'lucide-react';
import {
  FieldTestResult,
  FieldTestSuiteReport,
  FieldTestCategory,
  FieldTestStatus,
  FieldTestDefinition,
} from '../../../tests/fieldTestTypes';
import { fieldTestRegistry } from '../../../tests/fieldTestRegistry';
import { fieldTestRunner } from '../../../tests/fieldTestRunner';
import { FieldTestReportExporter } from '../../../tests/fieldTestReport';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../context/ToastContext';

interface FieldTestConsoleProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const FieldTestConsole: React.FC<FieldTestConsoleProps> = ({
  isOpen = true,
  onClose,
}) => {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentTest, setCurrentTest] = useState<{ id: string; name: string; index: number } | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [report, setReport] = useState<FieldTestSuiteReport | null>(null);
  const [resultsMap, setResultsMap] = useState<Record<string, FieldTestResult>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [expandedTestIds, setExpandedTestIds] = useState<Set<string>>(new Set());
  
  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(false);
  const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);

  // Environmental info
  const environment = (import.meta.env.MODE || 'development') as 'development' | 'production';
  const allowMutations = import.meta.env.VITE_FIELD_TEST_ALLOW_MUTATIONS === 'true';
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const allTests = fieldTestRegistry.getAllTests();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (autoScrollLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScrollLogs]);

  // Run all 30 tests
  const handleRunAll = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentTest(null);
    setProgressPercent(0);
    setLogs([]);
    setResultsMap({});

    try {
      const suiteReport = await fieldTestRunner.runTests(allTests, user, {
        onSuiteStart: (_total) => {
          setProgressPercent(0);
        },
        onTestStart: (test, index, total) => {
          setCurrentTest({ id: test.id, name: test.name, index });
          setProgressPercent(Math.round(((index - 1) / total) * 100));
        },
        onTestComplete: (result, index, total) => {
          setResultsMap((prev) => ({ ...prev, [result.id]: result }));
          setProgressPercent(Math.round((index / total) * 100));
        },
        onLog: (line) => {
          setLogs((prev) => [...prev, line]);
        },
        onSuiteComplete: (finalReport) => {
          setReport(finalReport);
          setIsRunning(false);
          setCurrentTest(null);
          setProgressPercent(100);
          if (finalReport.failed === 0) {
            success(`اكتملت الاختبارات بنتيجة ${finalReport.score}% (${finalReport.finalStatus})`);
          } else {
            toastError(`اكتملت الاختبارات بنتيجة ${finalReport.score}% (فشل ${finalReport.failed} اختبار)`);
          }
        },
      });

      setReport(suiteReport);
    } catch (e: any) {
      toastError(e.message || 'فشل في تشغيل الاختبارات');
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  // Run only failed tests
  const handleRunFailed = async () => {
    if (isRunning || !report) return;
    const failedDefinitions = allTests.filter((t) => {
      const res = resultsMap[t.id];
      return res && res.status === 'FAIL';
    });

    if (failedDefinitions.length === 0) {
      info('لا توجد اختبارات فاشلة لإعادة تشغيلها');
      return;
    }

    setIsRunning(true);
    try {
      await fieldTestRunner.runTests(failedDefinitions, user, {
        onTestStart: (test, index, total) => {
          setCurrentTest({ id: test.id, name: test.name, index });
          setProgressPercent(Math.round(((index - 1) / total) * 100));
        },
        onTestComplete: (result, index, total) => {
          setResultsMap((prev) => ({ ...prev, [result.id]: result }));
          setProgressPercent(Math.round((index / total) * 100));
        },
        onLog: (line) => {
          setLogs((prev) => [...prev, line]);
        },
      });
      success('تمت إعادة فحص الاختبارات المحددة');
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  // Run single test
  const handleRunSingleTest = async (testDef: FieldTestDefinition) => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentTest({ id: testDef.id, name: testDef.name, index: testDef.index });

    try {
      await fieldTestRunner.runTests([testDef], user, {
        onTestComplete: (res) => {
          setResultsMap((prev) => ({ ...prev, [res.id]: res }));
          if (res.status === 'PASS') {
            success(`[${res.id}] اكتمل بنجاح: PASS 🟢`);
          } else if (res.status === 'WARN') {
            info(`[${res.id}] تحذير: WARN 🟡`);
          } else if (res.status === 'FAIL') {
            toastError(`[${res.id}] فشل الاختبار: FAIL 🔴`);
          } else {
            info(`[${res.id}] تخطي: SKIPPED ⚪`);
          }
        },
        onLog: (line) => setLogs((prev) => [...prev, line]),
      });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  const handleStop = () => {
    fieldTestRunner.stop();
    setIsRunning(false);
    info('تم إيقاف تنفيذ الاختبارات');
  };

  // Exporters
  const handleCopyReport = async () => {
    if (!report) {
      info('يرجى تشغيل الاختبارات أولاً لتوليد التقرير');
      return;
    }
    const copySuccess = await FieldTestReportExporter.copyToClipboard(report);
    if (copySuccess) {
      success('تم نسخ التقرير النصي إلى الحافظة بنجاح 📋');
    } else {
      toastError('تعذر الوصول إلى الحافظة');
    }
  };

  const handleExportJSON = () => {
    if (!report) {
      info('يرجى تشغيل الاختبارات أولاً');
      return;
    }
    const json = FieldTestReportExporter.toJSONString(report);
    FieldTestReportExporter.downloadFile(
      `kafrawy-go-field-test-${Date.now()}.json`,
      json,
      'application/json'
    );
    success('تم تصدير ملف JSON بنجاح');
  };

  const handleExportHTML = () => {
    if (!report) {
      info('يرجى تشغيل الاختبارات أولاً');
      return;
    }
    const html = FieldTestReportExporter.toHTMLDocument(report);
    FieldTestReportExporter.downloadFile(
      `kafrawy-go-field-test-${Date.now()}.html`,
      html,
      'text/html'
    );
    success('تم تصدير ملف HTML بنجاح');
  };

  const toggleExpand = (id: string) => {
    setExpandedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered tests list
  const filteredTests = allTests.filter((test) => {
    const res = resultsMap[test.id];
    const matchesCat = selectedCategory === 'ALL' || test.category === selectedCategory;
    const matchesStatus =
      selectedStatusFilter === 'ALL' ||
      (selectedStatusFilter === 'UNTESTED' && !res) ||
      (res && res.status === selectedStatusFilter);
    const matchesSearch =
      searchQuery === '' ||
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  const passedCount = Object.values(resultsMap).filter((r: FieldTestResult) => r.status === 'PASS').length;
  const failedCount = Object.values(resultsMap).filter((r: FieldTestResult) => r.status === 'FAIL').length;
  const warnedCount = Object.values(resultsMap).filter((r: FieldTestResult) => r.status === 'WARN').length;
  const skippedCount = Object.values(resultsMap).filter((r: FieldTestResult) => r.status === 'SKIPPED').length;

  const evaluatedTotal = passedCount + failedCount + warnedCount;
  const calculatedScore =
    evaluatedTotal === 0 ? 100 : Number((((passedCount * 100 + warnedCount * 70) / evaluatedTotal)).toFixed(1));

  const categories = fieldTestRegistry.getCategories();

  return (
    <div
      id="kafrawy-go-field-test-lab"
      dir="rtl"
      className="w-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col font-sans"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* 1. TOP STATUS HEADER */}
      <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  مختبر اختبارات كفراوي Go الميدانية
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[11px] font-bold">
                  30 اختبار آلي
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                فحص شامل للمصادقة، GPS، المسارات OSRM، والتسعيرة، وRLS، والبث الحي
              </p>
            </div>
          </div>

          {onClose && (
            <button
              id="btn-close-field-test"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Environmental Pills Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          {/* Environment */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>البيئة:</span>
            <strong className="text-white uppercase">{environment}</strong>
          </div>

          {/* Mutation Policy Guard */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>أمان الطفرات:</span>
            <strong className={allowMutations ? 'text-amber-400' : 'text-emerald-400'}>
              {allowMutations ? 'مسموح' : 'محمي ومحظور 🛡️'}
            </strong>
          </div>

          {/* Network */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>الشبكة:</span>
            <strong className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
              {isOnline ? 'متصل' : 'غير متصل'}
            </strong>
          </div>

          {/* GPS Hardware */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>GPS:</span>
            <strong className="text-blue-400">نشط وجاهز</strong>
          </div>
        </div>
      </div>

      {/* 2. OVERALL SCORE & SUMMARY DASHBOARD */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900/60 to-slate-950 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Score & Verdict */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Circular/Square Score Badge */}
          <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border-2 border-emerald-500/40 flex flex-col items-center justify-center p-2 shadow-inner shrink-0">
            <span
              className="text-2xl font-black text-emerald-400 leading-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {report ? report.score : calculatedScore}%
            </span>
            <span className="text-[10px] text-slate-400 font-bold mt-1">النتيجة الكلية</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">حالة الاعتماد الميداني:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  failedCount > 0
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                    : warnedCount > 0
                    ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                    : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                }`}
              >
                {failedCount > 0
                  ? '🔴 غير جاهز (توجد أخطاء)'
                  : warnedCount > 0
                  ? '🟡 اجتياز مع تحذيرات'
                  : '🟢 جاهز للاختبار الميداني'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              تم تنفيذ <strong>{Object.keys(resultsMap).length}</strong> من أصل <strong>30</strong> اختبار.
            </p>
          </div>
        </div>

        {/* 4 Counter Pills */}
        <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-2 text-center min-w-[65px]">
            <span
              className="block text-lg font-black text-emerald-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {passedCount}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">PASS 🟢</span>
          </div>

          <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-2 text-center min-w-[65px]">
            <span
              className="block text-lg font-black text-rose-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {failedCount}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">FAIL 🔴</span>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2 text-center min-w-[65px]">
            <span
              className="block text-lg font-black text-amber-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {warnedCount}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">WARN 🟡</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-2 text-center min-w-[65px]">
            <span
              className="block text-lg font-black text-slate-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {skippedCount}
            </span>
            <span className="text-[10px] text-slate-400 font-bold">SKIP ⚪</span>
          </div>
        </div>
      </div>

      {/* 3. ACTIVE PROGRESS BAR (DURING RUN) */}
      {isRunning && (
        <div className="p-4 bg-slate-900/95 border-b border-indigo-500/30 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>
                جاري الفحص: <strong>[{currentTest?.id}] {currentTest?.name}</strong>
              </span>
            </div>
            <span
              className="font-black text-indigo-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-400"
              style={{ width: `${progressPercent}%` }}
              transition={{ ease: 'easeOut', duration: 0.2 }}
            />
          </div>
        </div>
      )}

      {/* 4. ACTIONS TOOLBAR */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        {/* Execution Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isRunning ? (
            <button
              id="btn-run-all-tests"
              onClick={handleRunAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>تشغيل الكل (30 اختبار)</span>
            </button>
          ) : (
            <button
              id="btn-stop-tests"
              onClick={handleStop}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-900/30 active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>إيقاف التشغيل</span>
            </button>
          )}

          {failedCount > 0 && !isRunning && (
            <button
              id="btn-run-failed-tests"
              onClick={handleRunFailed}
              className="px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة الفاشل ({failedCount})</span>
            </button>
          )}

          <button
            id="btn-toggle-terminal"
            onClick={() => setShowLogsDrawer(!showLogsDrawer)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              showLogsDrawer
                ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>سجل الأوامر ({logs.length})</span>
          </button>
        </div>

        {/* Report Export Controls */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-copy-report"
            onClick={handleCopyReport}
            title="نسخ التقرير النصي"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">نسخ</span>
          </button>

          <button
            id="btn-export-json"
            onClick={handleExportJSON}
            title="تصدير JSON"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            id="btn-export-html"
            onClick={handleExportHTML}
            title="تصدير تقرير HTML كامل"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HTML</span>
          </button>
        </div>
      </div>

      {/* 5. FILTER TABS & SEARCH BAR */}
      <div className="p-3 bg-slate-950 border-b border-slate-800/80 flex flex-col gap-2.5">
        {/* Search Input & Status Chips */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="input-search-tests"
              type="text"
              placeholder="بحث في أسماء الاختبارات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full no-scrollbar pb-0.5">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'PASS', label: 'ناجح 🟢' },
              { id: 'FAIL', label: 'فاشل 🔴' },
              { id: 'WARN', label: 'تحذير 🟡' },
              { id: 'SKIPPED', label: 'متخطى ⚪' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedStatusFilter(chip.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStatusFilter === chip.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Horizontal Scrolling Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-200 text-slate-900'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            الكل ({allTests.length})
          </button>

          {categories.map((cat) => {
            const count = allTests.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. EXPANDABLE TERMINAL LOGS DRAWER */}
      <AnimatePresence>
        {showLogsDrawer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 220, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900/90 border-b border-slate-800 flex flex-col overflow-hidden text-xs"
          >
            <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Live Field Test Telemetry Stream</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoScrollLogs(!autoScrollLogs)}
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    autoScrollLogs ? 'bg-indigo-900/50 text-indigo-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  التمرير التلقائي {autoScrollLogs ? 'مفعل' : 'معطل'}
                </button>
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  مسح السجل
                </button>
              </div>
            </div>

            <div
              className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 text-slate-300 bg-slate-950/90"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-4">اضغط على "تشغيل الكل" لبدء الاختبارات وتدفق السجلات الحية...</div>
              ) : (
                logs.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('PASS')
                        ? 'text-emerald-400'
                        : line.includes('FAIL')
                        ? 'text-rose-400 font-bold'
                        : line.includes('WARN')
                        ? 'text-amber-400'
                        : line.includes('SKIPPED')
                        ? 'text-slate-400'
                        : 'text-slate-300'
                    }
                  >
                    {line}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. TEST CARDS LIST */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto max-h-[600px] space-y-2.5">
        {filteredTests.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-bold">لا توجد اختبارات تطابق الفلاتر المحددة</p>
          </div>
        ) : (
          filteredTests.map((test) => {
            const res = resultsMap[test.id];
            const isExpanded = expandedTestIds.has(test.id);

            return (
              <div
                key={test.id}
                id={`field-test-card-${test.id}`}
                className={`rounded-2xl border transition-all ${
                  res?.status === 'PASS'
                    ? 'bg-slate-900/70 border-emerald-500/20 hover:border-emerald-500/40'
                    : res?.status === 'FAIL'
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                    : res?.status === 'WARN'
                    ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                    : res?.status === 'SKIPPED'
                    ? 'bg-slate-900/40 border-slate-800'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(test.id)}
                  className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Icon */}
                    <div className="shrink-0">
                      {res?.status === 'PASS' ? (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : res?.status === 'FAIL' ? (
                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                          <XCircle className="w-4 h-4" />
                        </div>
                      ) : res?.status === 'WARN' ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : res?.status === 'SKIPPED' ? (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">
                          —
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center text-xs font-mono font-bold">
                          {test.index}
                        </div>
                      )}
                    </div>

                    {/* Test Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-black text-slate-400"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          [{test.id}]
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {test.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {res ? res.message : test.description}
                      </p>
                    </div>
                  </div>

                  {/* Right Tags & Expand Icon */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                      {test.category}
                    </span>

                    {res && (
                      <span
                        className="text-[10px] font-mono text-slate-400 hidden sm:inline"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {res.durationMs}ms
                      </span>
                    )}

                    <button className="w-6 h-6 rounded-lg bg-slate-800/80 text-slate-400 flex items-center justify-center">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/60 flex flex-col gap-2.5 text-xs text-slate-300"
                    >
                      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2">
                        <div>
                          <span className="text-[11px] text-slate-500 font-bold block mb-0.5">الوصف الوظيفي:</span>
                          <p className="text-slate-300">{test.description}</p>
                        </div>

                        {res?.details && (
                          <div>
                            <span className="text-[11px] text-slate-500 font-bold block mb-0.5">المعطيات والتفاصيل:</span>
                            <pre
                              className="bg-slate-900 p-2 rounded-lg text-[11px] text-emerald-300 overflow-x-auto"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {res.details}
                            </pre>
                          </div>
                        )}

                        {res?.error && (
                          <div>
                            <span className="text-[11px] text-rose-400 font-bold block mb-0.5">الخطأ المسجل:</span>
                            <pre
                              className="bg-rose-950/40 border border-rose-800/50 p-2 rounded-lg text-[11px] text-rose-300 overflow-x-auto"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                            >
                              {res.error}
                            </pre>
                          </div>
                        )}

                        {/* Test Meta Requirements Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {test.requiresRealDevice && (
                            <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50 text-[10px]">
                              📱 يتطلب جهاز GPS
                            </span>
                          )}
                          {test.requiresRealtime && (
                            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50 text-[10px]">
                              ⚡ يتطلب Realtime
                            </span>
                          )}
                          {test.requiresDatabase && (
                            <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50 text-[10px]">
                              🗄️ يتطلب اتصال قاعدة البيانات
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Single Test Run CTA */}
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleRunSingleTest(test)}
                          disabled={isRunning}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>فحص هذا الاختبار منفردًا</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
