import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Clock,
  User,
  Eye,
  FileCode,
  X,
  Filter,
} from 'lucide-react';
import { AdminAuditLog } from '../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatSafeTime, formatSafeDate } from '../utils/dateUtils';

interface AuditLogsViewProps {
  logs: AdminAuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor_name.toLowerCase().includes(q) ||
        log.target_entity.toLowerCase().includes(q) ||
        log.target_id?.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              <span>سجل العمليات الإدارية والأمان (Audit Logs & Security Ledger)</span>
              <Badge className="bg-slate-100 text-slate-700">
                {filteredLogs.length} عملية مسجلة
              </Badge>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              سجل تدقيق غير قابل للتعديل يوثق كافة التعديلات، الاعتمادات، التحصيلات النقدية، وتغييرات الصلاحيات.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث بالإجراء، اسم المنفذ، الكيان المستهدف، أو رقم المعرف..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">التاريخ والوقت</th>
                <th className="py-3 px-4">منفذ الإجراء (Actor)</th>
                <th className="py-3 px-4">نوع الإجراء (Action)</th>
                <th className="py-3 px-4">الكيان المستهدف (Target Entity)</th>
                <th className="py-3 px-4">معرف الكيان (ID)</th>
                <th className="py-3 px-4 text-center">التفاصيل والتغييرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    لا توجد سجلات تطابق البحث.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={`log-row-${log.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {formatSafeTime(log.created_at)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatSafeDate(log.created_at)}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.actor_name}</div>
                      {log.ip_address && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          IP: {log.ip_address}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {log.action}
                      </span>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.target_entity}
                      </span>
                    </td>

                    {/* Target ID */}
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {log.target_id ? log.target_id.substring(0, 10) : '—'}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 px-2.5 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="w-3.5 h-3.5 ml-1 text-slate-500" />
                        عرض JSON
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              صفحة {currentPage} من {totalPages} (إجمالي {filteredLogs.length} سجل)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-7 text-xs"
              >
                السابق
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-7 text-xs"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Payload Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto dir-rtl flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedLog(null)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">
                  تفاصيل السجل: {selectedLog.action}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold">منفذ الإجراء:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedLog.actor_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">التاريخ:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {new Date(selectedLog.created_at).toLocaleString('ar-EG')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">الكيان:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedLog.target_entity}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">معرف الكيان:</span>{' '}
                  <span className="font-mono text-slate-900">{selectedLog.target_id || '—'}</span>
                </div>
              </div>

              {/* Old vs New Values */}
              <div className="space-y-2">
                <div className="font-bold text-slate-700">القيم السابقة (Old Value):</div>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40">
                  {selectedLog.old_value
                    ? JSON.stringify(selectedLog.old_value, null, 2)
                    : '// لا توجد قيم سابقة مسجلة'}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-700">القيم الجديدة (New Value):</div>
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40">
                  {selectedLog.new_value
                    ? JSON.stringify(selectedLog.new_value, null, 2)
                    : '// لا توجد قيم جديدة مسجلة'}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedLog(null)} className="text-xs">
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
