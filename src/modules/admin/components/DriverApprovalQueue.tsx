import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Car,
  FileText,
  User,
  Phone,
  Clock,
  Lock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { LiveDriver } from '../types';
import { VerificationStatus } from '../../../types/auth';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface DriverApprovalQueueProps {
  drivers: LiveDriver[];
  onUpdateDriverStatus: (driverId: string, status: VerificationStatus) => Promise<void>;
  onSelectDriver: (driver: LiveDriver) => void;
  isLoading: boolean;
}

export const DriverApprovalQueue: React.FC<DriverApprovalQueueProps> = ({
  drivers,
  onUpdateDriverStatus,
  onSelectDriver,
  isLoading,
}) => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'suspended' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    driver: LiveDriver;
    targetStatus: VerificationStatus;
    actionLabel: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredDrivers = drivers.filter((d) => {
    if (filter !== 'all' && d.approval_status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.driver_name.toLowerCase().includes(q) ||
        d.driver_phone?.toLowerCase().includes(q) ||
        d.national_id.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setIsProcessing(true);
    try {
      await onUpdateDriverStatus(confirmModal.driver.id, confirmModal.targetStatus);
      setConfirmModal(null);
    } catch (e: any) {
      console.error('Error updating driver status:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">معتمد</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">بانتظار المراجعة</Badge>;
      case 'suspended':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">موقوف مؤقتاً</Badge>;
      case 'rejected':
        return <Badge className="bg-slate-100 text-slate-700">مرفوض</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>قائمة تدقيق واعتماد الكباتن (Driver Approval & Compliance Queue)</span>
              <Badge className="bg-slate-100 text-slate-700">
                {filteredDrivers.length} طلب
              </Badge>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مراجعة الوثائق، الرخص، والأرقام القومية للكباتن الجدد وتفعيل صلاحية استقبال طلبات التوصيل عبر RPC الآمن.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              قيد المراجعة ({drivers.filter((d) => d.approval_status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                filter === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              معتمد ({drivers.filter((d) => d.approval_status === 'approved').length})
            </button>
            <button
              onClick={() => setFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                filter === 'suspended'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              موقوف ({drivers.filter((d) => d.approval_status === 'suspended').length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({drivers.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث بالاسم، رقم الهاتف، الرقم القومي، رقم رخصة القيادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Drivers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDrivers.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            لا توجد طلبات كباتن مطابقة للتصفية الحالية.
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <div
              key={`approval-card-${driver.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5 hover:shadow-md transition-shadow"
            >
              {/* Top info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                    {driver.driver_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{driver.driver_name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{driver.driver_phone || 'بدون هاتف'}</span>
                    </p>
                  </div>
                </div>

                <div>{getStatusBadge(driver.approval_status)}</div>
              </div>

              {/* Document & Vehicle Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold">الرقم القومي:</div>
                  <div className="font-mono font-bold text-slate-800 text-[11px] truncate">
                    {driver.national_id || 'غير مدخل'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 font-semibold">رقم الرخصة:</div>
                  <div className="font-mono font-bold text-slate-800 text-[11px] truncate">
                    {driver.license_number || 'غير مدخل'}
                  </div>
                </div>

                <div className="col-span-2 pt-1 border-t border-slate-200/60">
                  <div className="text-[10px] text-slate-500 font-semibold">المركبة المسجلة:</div>
                  <div className="font-bold text-slate-800 text-[11px]">
                    {driver.active_vehicle
                      ? `${driver.active_vehicle.make} ${driver.active_vehicle.model} (${driver.active_vehicle.year}) • لوحة: ${driver.active_vehicle.plate_number}`
                      : 'لم يتم تسجيل مركبة بعد'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectDriver(driver)}
                  className="h-8 text-xs text-slate-700 hover:bg-slate-100"
                >
                  <Eye className="w-3.5 h-3.5 ml-1 text-slate-500" />
                  فحص كامل الملف
                </Button>

                <div className="flex items-center gap-1.5">
                  {driver.approval_status !== 'approved' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmModal({
                          driver,
                          targetStatus: 'approved',
                          actionLabel: 'اعتماد وتفعيل الكابتن',
                        })
                      }
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                      اعتماد
                    </Button>
                  )}

                  {driver.approval_status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setConfirmModal({
                          driver,
                          targetStatus: 'rejected',
                          actionLabel: 'رفض طلب الانضمام',
                        })
                      }
                      className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 font-bold"
                    >
                      <XCircle className="w-3.5 h-3.5 ml-1" />
                      رفض
                    </Button>
                  )}

                  {driver.approval_status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setConfirmModal({
                          driver,
                          targetStatus: 'suspended',
                          actionLabel: 'إيقاف حساب الكابتن مؤقتاً',
                        })
                      }
                      className="h-8 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 font-bold"
                    >
                      <Lock className="w-3.5 h-3.5 ml-1" />
                      إيقاف مؤقت
                    </Button>
                  )}

                  {driver.approval_status === 'suspended' && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmModal({
                          driver,
                          targetStatus: 'approved',
                          actionLabel: 'إلغاء الإيقاف وإعادة التفعيل',
                        })
                      }
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <RefreshCw className="w-3.5 h-3.5 ml-1" />
                      إعادة تفعيل
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto dir-rtl flex items-center justify-center p-4">
          <div
            onClick={() => !isProcessing && setConfirmModal(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  تأكيد الإجراء الإداري
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmModal.actionLabel} للكابتن ({confirmModal.driver.driver_name})
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <p>
                سيتم تنفيذ التغيير مباشرة عبر RPC الآمن (<code className="font-mono text-emerald-700 font-bold">admin_approve_driver</code>) وتحديث صلاحيات الكابتن فوراً.
              </p>
              {confirmModal.targetStatus === 'approved' && (
                <p className="text-emerald-700 font-semibold">
                  • سيتمكن الكابتن من فتح التطبيق وبدء استقبال رحلات الركاب.
                </p>
              )}
              {confirmModal.targetStatus === 'suspended' && (
                <p className="text-rose-700 font-semibold">
                  • سيتم حظر استقبال أي طلبات جديدة وفصل وضع الاتصال فوراً.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isProcessing}
                onClick={() => setConfirmModal(null)}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                disabled={isProcessing}
                onClick={handleConfirmAction}
                className={`text-xs font-bold ${
                  confirmModal.targetStatus === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {isProcessing ? 'جارِ التنفيذ...' : 'تأكيد وحفظ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
