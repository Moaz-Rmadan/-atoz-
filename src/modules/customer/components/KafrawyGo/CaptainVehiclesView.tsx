import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Power,
  Trash2,
  Star,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Vehicle, DriverProfile, mobilityApi } from '../../services/mobilityApi';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';

interface CaptainVehiclesViewProps {
  driverProfile: DriverProfile | null;
  selectedVehicleId: string;
  onSelectPrimaryVehicle: (vehicleId: string) => void;
  onBack: () => void;
}

export const CaptainVehiclesView: React.FC<CaptainVehiclesViewProps> = ({
  driverProfile,
  selectedVehicleId,
  onSelectPrimaryVehicle,
  onBack,
}) => {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Sheet States
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deactivatingVehicle, setDeactivatingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [make, setMake] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [plateNumber, setPlateNumber] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const loadVehicles = async () => {
    if (!driverProfile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await mobilityApi.getDriverVehicles(driverProfile.id);
      setVehicles(data);

      // If no primary vehicle is set or the current one is missing/inactive, auto-select first active vehicle
      if (data.length > 0) {
        const hasSelected = data.some((v) => v.id === selectedVehicleId && v.is_active);
        if (!hasSelected) {
          const firstActive = data.find((v) => v.is_active);
          if (firstActive) {
            onSelectPrimaryVehicle(firstActive.id);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load vehicles:', err);
      setErrorMessage(err.message || 'تعذر تحميل قائمة المركبات.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [driverProfile?.id]);

  const openAddSheet = () => {
    setEditingVehicle(null);
    setMake('');
    setModel('');
    setYear(new Date().getFullYear());
    setPlateNumber('');
    setColor('فضي');
    setFormErrors({});
    setIsSheetOpen(true);
  };

  const openEditSheet = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setYear(vehicle.year);
    setPlateNumber(vehicle.plate_number);
    setColor(vehicle.color || '');
    setFormErrors({});
    setIsSheetOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    const trimmedMake = make.trim();
    const trimmedModel = model.trim();
    const trimmedPlate = plateNumber.trim();
    const currentYear = new Date().getFullYear();

    if (!trimmedMake) {
      errors.make = 'من فضلك أدخل ماركة السيارة (مثلاً: هيونداي، تويوتا)';
    } else if (trimmedMake.length > 100) {
      errors.make = 'اسم الماركة طويل جداً (الحد الأقصى 100 حرف)';
    }

    if (!trimmedModel) {
      errors.model = 'من فضلك أدخل موديل السيارة (مثلاً: إلنترا، كورولا)';
    } else if (trimmedModel.length > 100) {
      errors.model = 'اسم الموديل طويل جداً (الحد الأقصى 100 حرف)';
    }

    if (!year || isNaN(year) || year < 2000 || year > currentYear + 1) {
      errors.year = `سنة الصنع غير صحيحة (يجب أن تكون بين 2000 و ${currentYear + 1})`;
    }

    if (!trimmedPlate) {
      errors.plateNumber = 'من فضلك أدخل رقم اللوحة (مثلاً: ل ق ر 9514)';
    } else if (trimmedPlate.length > 50) {
      errors.plateNumber = 'رقم اللوحة طويل جداً (الحد الأقصى 50 حرف)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!driverProfile?.id || !user?.id) {
      toastError('يرجى تسجيل الدخول والتحقق من حساب الكابتن أولاً.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVehicle) {
        // Edit Existing Vehicle
        await mobilityApi.updateVehicle(editingVehicle.id, {
          make: make.trim(),
          model: model.trim(),
          year: Number(year),
          plateNumber: plateNumber.trim(),
          color: color.trim() || null,
        });
        success('تم تحديث بيانات المركبة بنجاح ✨');
      } else {
        // Add New Vehicle
        const newV = await mobilityApi.addVehicle(driverProfile.id, {
          make: make.trim(),
          model: model.trim(),
          year: Number(year),
          plateNumber: plateNumber.trim(),
          color: color.trim() || null,
        });
        success('تمت إضافة المركبة بنجاح 🎉');
        if (vehicles.length === 0) {
          onSelectPrimaryVehicle(newV.id);
        }
      }

      setIsSheetOpen(false);
      await loadVehicles();
    } catch (err: any) {
      console.error('Error submitting vehicle form:', err);
      toastError(err.message || 'حدث خطأ أثناء حفظ بيانات المركبة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (vehicle: Vehicle) => {
    if (!vehicle.is_active) {
      // Activating vehicle
      try {
        await mobilityApi.toggleVehicleStatus(vehicle.id, true);
        success(`تم تفعيل مركبة ${vehicle.make} ${vehicle.model} بنجاح 🟢`);
        await loadVehicles();
      } catch (err: any) {
        toastError(err.message || 'تعذر تفعيل المركبة.');
      }
    } else {
      // Prompt confirmation before deactivating
      setDeactivatingVehicle(vehicle);
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingVehicle) return;
    try {
      await mobilityApi.toggleVehicleStatus(deactivatingVehicle.id, false);
      info(`تم تعطيل مركبة ${deactivatingVehicle.make} ${deactivatingVehicle.model}`);

      // If deactivated was primary, clear selection
      if (selectedVehicleId === deactivatingVehicle.id) {
        onSelectPrimaryVehicle('');
      }

      setDeactivatingVehicle(null);
      await loadVehicles();
    } catch (err: any) {
      toastError(err.message || 'تعذر تعطيل المركبة.');
    }
  };

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;
    try {
      await mobilityApi.deleteVehicle(deletingVehicle.id);
      success('تم حذف المركبة بنجاح 🗑️');

      if (selectedVehicleId === deletingVehicle.id) {
        onSelectPrimaryVehicle('');
      }

      setDeletingVehicle(null);
      await loadVehicles();
    } catch (err: any) {
      toastError(err.message || 'تعذر حذف المركبة.');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[80vh] overflow-y-auto no-scrollbar dir-rtl flex flex-col gap-4">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
            title="الرجوع للوحة التحكم"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>مركباتي</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-black rounded-lg">
                {vehicles.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">إدارة المركبات المرتبطة بحساب الكابتن</p>
          </div>
        </div>

        <button
          onClick={openAddSheet}
          className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مركبة</span>
        </button>
      </div>

      {/* 2. Loading State */}
      {isLoading && (
        <div className="space-y-3 py-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded-md w-32" />
                <div className="h-4 bg-slate-200 rounded-md w-16" />
              </div>
              <div className="h-3 bg-slate-200 rounded-md w-24" />
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-slate-200 rounded-xl flex-1" />
                <div className="h-8 bg-slate-200 rounded-xl flex-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Error Banner */}
      {!isLoading && errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-rose-800">{errorMessage}</p>
            <button
              onClick={loadVehicles}
              className="text-[11px] font-bold text-rose-700 underline mt-1 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* 4. Empty State */}
      {!isLoading && !errorMessage && vehicles.length === 0 && (
        <div className="text-center py-10 px-4 bg-slate-50 border border-slate-200/80 rounded-3xl flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-200/60 rounded-2xl flex items-center justify-center text-slate-500 mb-3 shadow-inner">
            <Car className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-black text-slate-900 mb-1">لم تسجل أي مركبة بعد</h4>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mb-5">
            أضف بيانات مركبتك الآن لتتمكن من استقبال وقبول طلبات الرحلات في كفر البطيخ ودمياط.
          </p>
          <button
            onClick={openAddSheet}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول مركبة</span>
          </button>
        </div>
      )}

      {/* 5. Vehicles List */}
      {!isLoading && !errorMessage && vehicles.length > 0 && (
        <div className="space-y-3">
          {vehicles.map((v) => {
            const isPrimary = selectedVehicleId === v.id;
            return (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition-all ${
                  isPrimary
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                    : v.is_active
                    ? 'bg-white text-slate-900 border-slate-200/90 shadow-sm hover:border-slate-300'
                    : 'bg-slate-50/80 text-slate-500 border-slate-200 opacity-75'
                }`}
              >
                {/* Header Row: Make/Model & Badges */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isPrimary
                          ? 'bg-white/10 text-emerald-400'
                          : v.is_active
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm">{v.make} {v.model}</h4>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isPrimary
                              ? 'bg-white/15 text-slate-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {v.year}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {v.color && (
                          <span className="text-[10px] opacity-75 font-medium">اللون: {v.color}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {/* Status Badge */}
                    {v.is_active ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isPrimary
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        مركبة نشطة
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        معطلة
                      </span>
                    )}

                    {/* Primary Vehicle Indicator */}
                    {isPrimary && (
                      <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current text-amber-400" />
                        المركبة الحالية للرحلات
                      </span>
                    )}
                  </div>
                </div>

                {/* Plate Number & Identity Box */}
                <div
                  className={`my-3 p-2.5 rounded-xl flex items-center justify-between border ${
                    isPrimary
                      ? 'bg-white/5 border-white/10'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-75">رقم اللوحة المرورية</span>
                  <span
                    className="font-black text-sm tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {v.plate_number}
                  </span>
                </div>

                {/* Card Action Controls */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/10">
                  <div className="flex items-center gap-1.5">
                    {/* Edit Button */}
                    <button
                      onClick={() => openEditSheet(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                        isPrimary
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="تعديل بيانات المركبة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    {/* Toggle Active Status */}
                    <button
                      onClick={() => handleToggleActive(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                        v.is_active
                          ? isPrimary
                            ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title={v.is_active ? 'تعطيل المركبة' : 'تفعيل المركبة'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{v.is_active ? 'تعطيل' : 'تفعيل'}</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeletingVehicle(v)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                        isPrimary
                          ? 'hover:bg-white/10 text-slate-400 hover:text-rose-400'
                          : 'hover:bg-slate-100 text-slate-400 hover:text-rose-600'
                      }`}
                      title="حذف المركبة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Primary Selection Button */}
                  {v.is_active && !isPrimary && (
                    <button
                      onClick={() => {
                        onSelectPrimaryVehicle(v.id);
                        success(`تم تحديد ${v.make} ${v.model} كمركبة أساسية للرحلات ⭐`);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>استخدام للرحلات</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 6. ADD / EDIT VEHICLE BOTTOM SHEET */}
      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto no-scrollbar dir-rtl"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {editingVehicle ? 'تعديل بيانات المركبة' : 'إضافة مركبة جديدة'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      يرجى التأكد من مطابقة البيانات لرخصة تسيير المركبة
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                {/* Make & Model */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ماركة السيارة *</label>
                    <input
                      type="text"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      placeholder="هيونداي / تويوتا"
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition-all ${
                        formErrors.make ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                    {formErrors.make && (
                      <span className="text-[10px] font-bold text-rose-500 mt-1 block">{formErrors.make}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">الموديل (الطراز) *</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="إلنترا / كورولا"
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition-all ${
                        formErrors.model ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-900'
                      }`}
                    />
                    {formErrors.model && (
                      <span className="text-[10px] font-bold text-rose-500 mt-1 block">{formErrors.model}</span>
                    )}
                  </div>
                </div>

                {/* Year & Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">سنة الصنع *</label>
                    <input
                      type="number"
                      min={2000}
                      max={new Date().getFullYear() + 1}
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value, 10))}
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition-all ${
                        formErrors.year ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-900'
                      }`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    {formErrors.year && (
                      <span className="text-[10px] font-bold text-rose-500 mt-1 block">{formErrors.year}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">لون المركبة</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="فضي / أبيض / أسود"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Plate Number */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">رقم اللوحة المرورية *</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder="مثال: ل ق ر 9514"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-bold outline-none transition-all ${
                      formErrors.plateNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-slate-900'
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                  {formErrors.plateNumber ? (
                    <span className="text-[10px] font-bold text-rose-500 mt-1 block">{formErrors.plateNumber}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                      اكتب الحروف والأرقام كما هي مدونة في اللوحة المرورية
                    </span>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-slate-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting
                      ? 'جاري الحفظ...'
                      : editingVehicle
                      ? 'حفظ التعديلات'
                      : 'إضافة المركبة الآن'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSheetOpen(false)}
                    className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DEACTIVATION CONFIRMATION SHEET */}
      <AnimatePresence>
        {deactivatingVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center dir-rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-900 mb-1">هل تريد تعطيل هذه المركبة؟</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                مركبة <strong>{deactivatingVehicle.make} {deactivatingVehicle.model}</strong> لن تكون متاحة لاستقبال طلبات الرحلات حتى تعيد تفعيلها مرة أخرى.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmDeactivation}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  نعم، تعطيل المركبة
                </button>
                <button
                  onClick={() => setDeactivatingVehicle(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. DELETE CONFIRMATION SHEET */}
      <AnimatePresence>
        {deletingVehicle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-center dir-rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-900 mb-1">تأكيد حذف المركبة</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                هل أنت متأكد من رغبتك في حذف مركبة <strong>{deletingVehicle.make} {deletingVehicle.model}</strong> ({deletingVehicle.plate_number}) نهائياً من حسابك؟
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteVehicle}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  تأكيد الحذف
                </button>
                <button
                  onClick={() => setDeletingVehicle(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
