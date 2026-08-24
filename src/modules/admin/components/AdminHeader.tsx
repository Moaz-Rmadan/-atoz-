import React from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Radio,
  WifiOff,
  Bell,
  Clock,
  Car,
  AlertTriangle,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatSafeTime } from '../utils/dateUtils';

export interface AdminHeaderProps {
  adminName?: string;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  isRealtimeConnected?: boolean;
  isPollingFallback?: boolean;
  realtimeStatus?: 'connected' | 'polling' | 'disconnected';
  lastUpdated?: Date | string | null;
  lastSyncTime?: Date | string | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  alertsCount?: number;
  alertCount?: number;
  onOpenAlerts?: () => void;
  onNavigateToCustomerView?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  adminName = 'مدير النظام',
  activeTab,
  setActiveTab,
  isRealtimeConnected,
  isPollingFallback,
  realtimeStatus,
  lastUpdated,
  lastSyncTime,
  onRefresh,
  isLoading,
  isRefreshing,
  alertsCount,
  alertCount,
  onOpenAlerts,
  onNavigateToCustomerView,
}) => {
  // Normalize parameters
  const syncDate = lastUpdated || lastSyncTime || new Date();
  const loading = Boolean(isLoading || isRefreshing);
  const totalAlerts = alertsCount !== undefined ? alertsCount : (alertCount || 0);
  const isConnected = isRealtimeConnected ?? (realtimeStatus === 'connected');
  const isPolling = isPollingFallback ?? (realtimeStatus === 'polling');

  const handleOpenAlerts = () => {
    if (onOpenAlerts) {
      onOpenAlerts();
    } else if (setActiveTab) {
      setActiveTab('alerts');
    }
  };

  const formatTime = (d?: Date | string | null) => formatSafeTime(d);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30 rounded-2xl">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg font-black text-xl text-white">
            ك
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white">
                Kafrawy Go — غرفة العمليات والإدارة
              </h1>
              <Badge variant="outline" className="bg-emerald-950/60 text-emerald-400 border-emerald-700/50 text-[10px] py-0.5 px-2 font-bold">
                RLS نشط
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>مدير النظام:</span>
              <span className="font-semibold text-slate-200">{adminName}</span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                آخر تحديث: {formatTime(syncDate)}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Live Connection & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Connection Status Indicator */}
          {isConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">اتصال لحظي (Realtime)</span>
              <span className="sm:hidden">مباشر</span>
            </div>
          ) : isPolling ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-300 text-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="hidden sm:inline">مزامنة دورية (Polling)</span>
              <span className="sm:hidden">دوري</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs">
              <WifiOff className="w-3.5 h-3.5" />
              <span>غير متصل</span>
            </div>
          )}

          {/* Alerts Trigger */}
          <button
            onClick={handleOpenAlerts}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              totalAlerts > 0
                ? 'bg-rose-950/80 border border-rose-700 text-rose-300 hover:bg-rose-900/80 animate-pulse'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="تنبيهات العمليات الحية"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${totalAlerts > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>التنبيهات</span>
            {totalAlerts > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center shadow">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Manual Refresh Button */}
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs h-8 px-2.5 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
              <span className="hidden sm:inline">تحديث الآن</span>
            </Button>
          )}

          {/* Switch to Customer App */}
          {onNavigateToCustomerView && (
            <Button
              size="sm"
              variant="outline"
              onClick={onNavigateToCustomerView}
              className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs h-8 px-2 cursor-pointer"
              title="العودة لتطبيق الركاب"
            >
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
              <span className="hidden md:inline">واجهة التطبيق</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
