import React from 'react';
import { CatalogService } from '../../../types/customer';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Wrench, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

interface ServiceCardProps {
  service: CatalogService;
  onRequest: (service: CatalogService) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onRequest }) => {
  return (
    <Card className="hover:border-emerald-300 transition-all duration-200 hover:shadow-md flex flex-col justify-between group dir-rtl">
      <CardContent className="p-5 space-y-4">
        {/* Category & Verified Badge */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="emerald" size="sm" icon={<Wrench className="w-3 h-3" />}>
            {service.category?.name_ar || 'خدمات صيانة'}
          </Badge>

          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>حرفي موثق</span>
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
            {service.title_ar}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 min-h-[36px]">
            {service.description_ar || 'خدمة صيانة معتمدة بأسعار تنافسية بكفر البطيخ ودمياط.'}
          </p>
        </div>

        {/* Features Checklist */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>معاينة فورية</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>حجز بموعد مسبق</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-slate-400 font-bold">التقدير المبدئي</div>
            <div className="text-base font-black text-emerald-700">
              {service.base_price_estimate ? `${service.base_price_estimate} ج.م` : 'حسب المعاينة'}
            </div>
          </div>

          <Button
            onClick={() => onRequest(service)}
            size="sm"
            variant="primary"
            className="shadow-2xs"
          >
            طلب الخدمة الآن
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
