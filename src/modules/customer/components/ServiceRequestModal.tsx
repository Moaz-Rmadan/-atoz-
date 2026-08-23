import React, { useState, useEffect } from 'react';
import { CatalogService } from '../../../types/customer';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import {
  createSecureServiceRequest,
  fetchUserAddresses,
  createUserAddress,
  UserAddress
} from '../services/servicesApi';
import { Wrench, Calendar, MapPin, Send, AlertCircle, Plus } from 'lucide-react';

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: CatalogService | null;
  onSuccess?: () => void;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  isOpen,
  onClose,
  service,
  onSuccess,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { success, warning, error: toastError } = useToast();

  const [scheduledFor, setScheduledFor] = useState('');
  const [notes, setNotes] = useState('');
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  
  // New address state
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressTitle, setNewAddressTitle] = useState('منزلي الجديد');
  const [newAddressStreet, setNewAddressStreet] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load addresses when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadAddresses();
    }
  }, [isOpen, user]);

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const addrList = await fetchUserAddresses(user.id);
      setAddresses(addrList);
      if (addrList.length > 0) {
        setSelectedAddressId(addrList[0].id);
      } else {
        setShowNewAddressForm(true);
        setSelectedAddressId('new');
      }
    } catch (err) {
      console.error('Error loading addresses:', err);
    }
  };

  if (!service) return null;

  const handleAddressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedAddressId(val);
    if (val === 'new') {
      setShowNewAddressForm(true);
    } else {
      setShowNewAddressForm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      warning('يرجى تسجيل الدخول أولاً لطلب الخدمة');
      return;
    }

    if (selectedAddressId === 'new' && !newAddressStreet.trim()) {
      setError('يرجى كتابة تفاصيل العنوان الجديد أولاً.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let finalAddressId: string | null = selectedAddressId;

      // 1. Create address if new
      if (selectedAddressId === 'new') {
        const createdAddr = await createUserAddress(
          user.id,
          newAddressTitle.trim(),
          newAddressStreet.trim()
        );
        finalAddressId = createdAddr.id;
      }

      // 2. Submit service request (using secure price fetching inside servicesApi)
      await createSecureServiceRequest({
        customer_id: user.id,
        service_id: service.id,
        address_id: finalAddressId || null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        notes: notes.trim() || undefined
      });

      success('تم إرسال طلب الخدمة بنجاح، وسيتواصل معك الفني فور قبول الطلب');
      if (onSuccess) onSuccess();
      onClose();
      
      // Reset form states
      setScheduledFor('');
      setNotes('');
      setNewAddressStreet('');
      setShowNewAddressForm(false);
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال الطلب، يرجى التحقق من المدخلات.');
      toastError(err?.message || 'تعذر إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`طلب خدمة: ${service.title_ar}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 dir-rtl text-right">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Service Summary Box */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">{service.title_ar}</div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                التصنيف: {service.category?.name_ar || 'خدمات صيانة'}
              </div>
            </div>
          </div>

          <div className="text-left shrink-0">
            <div className="text-[10px] text-slate-500 font-bold">تقدير السعر</div>
            <div className="text-sm font-extrabold text-emerald-800">
              {service.base_price_estimate ? `${service.base_price_estimate} ج.م` : 'حسب المعاينة'}
            </div>
          </div>
        </div>

        {/* Saved Addresses Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            عنوان تنفيذ الخدمة بكفر الشيخ
          </label>
          <select
            value={selectedAddressId}
            onChange={handleAddressChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-[42px] cursor-pointer"
          >
            {addresses.map((addr) => (
              <option key={addr.id} value={addr.id}>
                📍 {addr.title} - {addr.street_address}
              </option>
            ))}
            <option value="new">➕ إضافة عنوان جديد لتنفيذ الخدمة...</option>
          </select>
        </div>

        {/* New Address Sub-Form */}
        {showNewAddressForm && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animation-fade-in">
            <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>إضافة عنوان تنفيذ جديد في كفر الشيخ</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Input
                  label="اسم العنوان"
                  placeholder="مثال: منزلي، العمل"
                  value={newAddressTitle}
                  onChange={(e) => setNewAddressTitle(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="عنوان الشارع بالتفصيل"
                  placeholder="مثال: تقسيم المحاربين بجوار قاعة كليوباترا"
                  value={newAddressStreet}
                  onChange={(e) => setNewAddressStreet(e.target.value)}
                  icon={<MapPin className="w-4 h-4 text-slate-400" />}
                  required={selectedAddressId === 'new'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Schedule Date Time */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            موعد الزيارة المطلوبة
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">اتركه فارغاً إذا كنت ترغب في زيارة فورية مستعجلة.</p>
        </div>

        {/* Notes Textarea */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ملاحظات إضافية للفني أو الحرفي
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اشرح المشكلة بالتفصيل (مثل: تسريب في خلاط المطبخ أو تركيب غسالة)..."
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            icon={<Send className="w-4 h-4" />}
          >
            تأكيد وإرسال الطلب
          </Button>
        </div>
      </form>
    </Modal>
  );
};
