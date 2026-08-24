import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  Star,
} from 'lucide-react';
import { CustomerSummary } from '../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface CustomerMonitorTableProps {
  customers: CustomerSummary[];
}

export const CustomerMonitorTable: React.FC<CustomerMonitorTableProps> = ({ customers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.phone_number?.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-900">
              مراقبة ومتابعة الركاب والعملاء (Customers & Passengers Log)
            </h2>
            <Badge className="bg-slate-100 text-slate-700">
              {filteredCustomers.length} مستخدم
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
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
                <th className="py-3 px-4">اسم الراكب (العميل)</th>
                <th className="py-3 px-4">رقم الهاتف</th>
                <th className="py-3 px-4">تاريخ التسجيل</th>
                <th className="py-3 px-4 text-center">إجمالي الرحلات</th>
                <th className="py-3 px-4 text-center">الرحلات المكتملة</th>
                <th className="py-3 px-4 text-center">الرحلات الملغاة</th>
                <th className="py-3 px-4">إجمالي الإنفاق التقديري</th>
                <th className="py-3 px-4">آخر رحلة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    لا يوجد عملاء يطابقون معايير البحث.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr
                    key={`customer-row-${customer.id}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Customer Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {customer.full_name.charAt(0)}
                        </div>
                        <div className="font-bold text-slate-900">{customer.full_name}</div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {customer.phone_number || 'بدون هاتف'}
                    </td>

                    {/* Registration Date */}
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(customer.created_at).toLocaleDateString('ar-EG')}
                    </td>

                    {/* Total Rides */}
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {customer.total_rides}
                    </td>

                    {/* Completed */}
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">
                      {customer.completed_rides}
                    </td>

                    {/* Cancelled */}
                    <td className="py-3 px-4 text-center text-rose-700 font-bold">
                      {customer.cancelled_rides}
                    </td>

                    {/* Total Spent */}
                    <td className="py-3 px-4 font-black text-slate-900">
                      {customer.total_spent} ج.م
                    </td>

                    {/* Last Ride */}
                    <td className="py-3 px-4 text-slate-500">
                      {customer.last_ride_date
                        ? new Date(customer.last_ride_date).toLocaleDateString('ar-EG')
                        : 'لا توجد رحلات'}
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
              صفحة {currentPage} من {totalPages} (إجمالي {filteredCustomers.length} عميل)
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
    </div>
  );
};
