import React from 'react';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Briefcase, FileText, UserCheck, Plus } from 'lucide-react';

export const EmployerDashboardPage: React.FC = () => {
  return (
    <DashboardLayout
      title="منصة التوظيف والأعمال (Kafrawy Jobs)"
      description="نشر إعلانات الوظائف، استلام السير الذاتية، وإدارة المقابلات بكفر الشيخ"
      badge={
        <Badge variant="blue" icon={<Briefcase className="w-3.5 h-3.5" />}>
          قطاع أصحاب الأعمال والتوظيف
        </Badge>
      }
      headerActions={
        <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
          نشر إعلان وظيفة جديد
        </Button>
      }
      statsGrid={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200 shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">6</div>
                <div className="text-xs font-semibold text-slate-500">وظائف معلنة نشطة</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">54</div>
                <div className="text-xs font-semibold text-slate-500">طلب توظيف مستلم</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">12</div>
                <div className="text-xs font-semibold text-slate-500">مرشح تم اختيارهم للمقابلة</div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>بوابة أصحاب الشركات والمؤسسات</CardTitle>
          <CardDescription>ربط الكفاءات والكوادر البشرية المحلية بالشركات والمؤسسات</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 leading-relaxed">
            مرحباً بك في بوابة التوظيف. يمكنك إضافة الشواغر الوظيفية واستقبال المتقدمين وإجراء المقابلات بكل سهولة.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};
