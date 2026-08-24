import React from 'react';
import {
  AlertTriangle,
  Clock,
  Car,
  Activity,
  Banknote,
  Navigation,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { OperationsAlert } from '../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatSafeTime } from '../utils/dateUtils';

interface OperationsAlertsProps {
  alerts: OperationsAlert[];
  onSelectEntity: (type: 'ride' | 'driver', id: string) => void;
  onRefresh: () => void;
}

export const OperationsAlerts: React.FC<OperationsAlertsProps> = ({
  alerts,
  onSelectEntity,
  onRefresh,
}) => {
  const getAlertIcon = (type: OperationsAlert['type']) => {
    switch (type) {
      case 'waiting_too_long':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'driver_stale':
        return <Car className="w-5 h-5 text-amber-600" />;
      case 'ride_stuck':
        return <Activity className="w-5 h-5 text-rose-500" />;
      case 'cash_pending':
        return <Banknote className="w-5 h-5 text-purple-500" />;
      case 'gps_lost':
        return <Navigation className="w-5 h-5 text-rose-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
              <h2 className="text-lg font-black text-white">
                تنبيهات واستقرار العمليات الحية (Operations Anomalies & Alert Center)
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              رصد آلي وتلقائي لأي اختناقات في الرحلات، تأخر قبول الطلبات، انقطاع نبضات الـ GPS، أو مستحقات كاش معلقة.
            </p>
          </div>

          <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-xs px-3 py-1 font-bold self-start sm:self-auto">
            {alerts.length} تنبيهات نشطة
          </Badge>
        </div>
      </div>

      {/* Alerts Grid */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            كافة العمليات تعمل بانسيابية ممتازة
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            لا توجد رحلات متوقفة، ولا انقطاعات في نبض الـ GPS للكباتن، وجميع الطلبات تسير وفق المعدلات الطبيعية.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between gap-3 ${
                alert.severity === 'critical'
                  ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                  : 'bg-amber-50/80 border-amber-300 text-amber-950'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-white shadow-xs">
                      {getAlertIcon(alert.type)}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {alert.title}
                    </h4>
                  </div>
                  <Badge
                    className={
                      alert.severity === 'critical'
                        ? 'bg-rose-600 text-white text-[10px]'
                        : 'bg-amber-600 text-white text-[10px]'
                    }
                  >
                    {alert.severity === 'critical' ? 'حرج' : 'تنبيه'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed pr-10">
                  {alert.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900/10 text-[11px]">
                <span className="text-slate-500">
                  {formatSafeTime(alert.created_at)}
                </span>

                {alert.entity_id && alert.entity_type && (
                  <Button
                    size="sm"
                    onClick={() => onSelectEntity(alert.entity_type!, alert.entity_id!)}
                    className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold"
                  >
                    <span>{alert.action_label || 'عرض التفاصيل'}</span>
                    <ArrowRight className="w-3.5 h-3.5 mr-1 rotate-180" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
