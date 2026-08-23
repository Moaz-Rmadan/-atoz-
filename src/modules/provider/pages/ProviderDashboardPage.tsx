import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Tabs } from '../../../components/ui/Tabs';
import {
  fetchProviderProfileByUserId,
  registerProviderProfile,
  fetchProviderAvailableRequests,
  fetchProviderRequests,
  transitionRequestStatus,
  fetchRequestHistory,
  StatusHistoryItem
} from '../../customer/services/servicesApi';
import { fetchServiceCategories } from '../../customer/services/customerApi';
import { ServiceProviderProfile, ServiceRequestItem, ServiceCategory, ServiceRequestStatus } from '../../../types/customer';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Users,
  Shield,
  Briefcase,
  AlertCircle,
  PlusCircle,
  Play,
  Check,
  XCircle,
  RefreshCw,
  Award,
  ChevronLeft,
  MapPin,
  Calendar,
  History
} from 'lucide-react';

export const ProviderDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { success, warning, error: toastError } = useToast();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [providerProfile, setProviderProfile] = useState<ServiceProviderProfile | null>(null);

  // Categories list for registration
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);

  // Active view tabs for craftsmen
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('available');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [availableRequests, setAvailableRequests] = useState<ServiceRequestItem[]>([]);
  const [myRequests, setMyRequests] = useState<ServiceRequestItem[]>([]);

  // Confirmation Modal state
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<{
    request: ServiceRequestItem;
    actionType: ServiceRequestStatus;
    actionLabel: string;
  } | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionNotes, setActionNotes] = useState('');

  // History logs viewer state
  const [selectedRequestForHistory, setSelectedRequestForHistory] = useState<ServiceRequestItem | null>(null);
  const [requestHistory, setRequestHistory] = useState<StatusHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileAndContext();
    }
  }, [user]);

  // Load provider profile and category list
  const loadProfileAndContext = async () => {
    if (!user) return;
    setIsLoadingProfile(true);
    try {
      const profile = await fetchProviderProfileByUserId(user.id);
      setProviderProfile(profile);

      // Fetch all service categories for registration / reference
      const cats = await fetchServiceCategories();
      setCategories(cats);

      if (profile && profile.verification_status === 'approved') {
        await loadProviderRequests(profile);
      }
    } catch (err) {
      console.error('Error loading provider profile context:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadProviderRequests = async (profile: ServiceProviderProfile) => {
    setIsLoadingRequests(true);
    try {
      const categoryIds = (profile as any).categoryIds || [];
      const [avail, mine] = await Promise.all([
        fetchProviderAvailableRequests(categoryIds),
        fetchProviderRequests(profile.id)
      ]);

      setAvailableRequests(avail);
      setMyRequests(mine);
    } catch (err) {
      console.error('Error fetching provider requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (selectedCategoryIds.length === 0) {
      warning('يرجى اختيار تصنيف مهني واحد على الأقل للتسجيل.');
      return;
    }

    if (!bio.trim() || bio.trim().length < 15) {
      warning('يرجى كتابة نبذة مهنية لا تقل عن 15 حرفاً تشرح فيها مهاراتك.');
      return;
    }

    setIsSubmittingOnboarding(true);
    try {
      await registerProviderProfile(user.id, bio.trim(), selectedCategoryIds);
      success('تم إرسال ملفك الفني بنجاح! سيتم مراجعته وتنشيطه من قبل الإدارة.');
      await loadProfileAndContext();
    } catch (err: any) {
      toastError(err?.message || 'تعذر تسجيل الحساب، يرجى إعادة المحاولة.');
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  const handleCategoryToggle = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const triggerRequestAction = (req: ServiceRequestItem, targetStatus: ServiceRequestStatus, label: string) => {
    setSelectedRequestForAction({
      request: req,
      actionType: targetStatus,
      actionLabel: label
    });
    setActionNotes('');
  };

  const handleConfirmRequestAction = async () => {
    if (!selectedRequestForAction || !providerProfile || !user) return;
    setIsPerformingAction(true);

    try {
      await transitionRequestStatus(
        selectedRequestForAction.request.id,
        providerProfile.id,
        user.id,
        selectedRequestForAction.request.status,
        selectedRequestForAction.actionType,
        actionNotes.trim() || undefined
      );

      success(`تم تنفيذ الإجراء (${selectedRequestForAction.actionLabel}) بنجاح.`);
      setSelectedRequestForAction(null);
      await loadProviderRequests(providerProfile);
    } catch (err: any) {
      toastError(err?.message || 'فشل تحديث حالة الطلب.');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleOpenHistory = async (req: ServiceRequestItem) => {
    setSelectedRequestForHistory(req);
    setIsLoadingHistory(true);
    try {
      const history = await fetchRequestHistory(req.id);
      setRequestHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Onboarding View for unregistered users
  if (!isLoadingProfile && !providerProfile) {
    return (
      <DashboardLayout
        title="انضم كشريك حرفي موثق"
        description="سجل مهاراتك الفنية وانضم لأفضل شبكة فنيين وحرفيين معتمدين بكفر الشيخ"
        badge={
          <Badge variant="amber" icon={<Wrench className="w-3.5 h-3.5" />}>
            التسجيل المهني
          </Badge>
        }
      >
        <Card className="dir-rtl text-right">
          <CardHeader>
            <CardTitle>تقديم طلب الانضمام إلى كفراوي صيانة</CardTitle>
            <CardDescription>
              املأ البيانات التالية لإنشاء ملفك المهني وسيتم فحص هويتك وتفعيل استقبال الطلبات في منطقتك بكفر الشيخ.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOnboardingSubmit} className="space-y-5">
              {/* Specialized Categories Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ما هي تخصصاتك والخدمات التي تقدمها؟ (اختر كل ما ينطبق عليك)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryToggle(cat.id)}
                      className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        selectedCategoryIds.includes(cat.id)
                          ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs">{cat.name_ar}</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedCategoryIds.includes(cat.id)
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {selectedCategoryIds.includes(cat.id) && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نبذة فنية مهنية عن مهاراتك وسنوات خبرتك
                </label>
                <textarea
                  rows={4}
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="مثال: فني سباكة بخبرة تزيد عن 8 سنوات في كفر الشيخ، متخصص في كشف التسريبات وصيانة تأسيس الحمامات وشبكات مياه الشرب بقطع غيار أصلية..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">يجب ألا تقل النبذة عن 15 حرفاً لتتمكن من تقديم الطلب.</p>
              </div>

              {/* Form submit */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingOnboarding}
                  icon={<PlusCircle className="w-4 h-4" />}
                >
                  تقديم طلب التسجيل الفني
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Pending Status View
  if (providerProfile && providerProfile.verification_status === 'pending') {
    return (
      <DashboardLayout
        title="لوحة تحكم الحرفيين"
        description="حالة مراجعة الحساب الفني"
      >
        <Card className="dir-rtl text-right p-6 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 border border-amber-200 rounded-full flex items-center justify-center mx-auto shadow-2xs">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">حسابك قيد المراجعة الفنية</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              مرحباً بك يا {providerProfile.profile?.full_name || 'مزود الخدمة'}. تم تقديم طلبك بنجاح وجاري فحص البيانات والمستندات السلوكية والفنية من قِبل إدارة كفراوي.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-right">
            <div className="text-[10px] text-slate-400 font-bold mb-1">النبذة المقدمة:</div>
            <p className="text-xs text-slate-600 italic font-medium">"{providerProfile.bio}"</p>
          </div>
          <p className="text-[10px] text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-lg inline-block border border-emerald-100 font-bold">
            سيتم تفعيل حسابك وإخطارك بإشعار فوري وتنبيه للبدء في استقبال طلبات كفر الشيخ فور الموافقة!
          </p>
        </Card>
      </DashboardLayout>
    );
  }

  // Rejected View
  if (providerProfile && providerProfile.verification_status === 'rejected') {
    return (
      <DashboardLayout title="لوحة الحرفيين" description="حالة الاعتماد">
        <Card className="dir-rtl text-right p-6 text-center max-w-xl mx-auto space-y-3">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">نأسف، لم يتم قبول طلب الاعتماد</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              لم يتم تفعيل حسابك كمقدم خدمة على المنصة. يمكنك التواصل مع الدعم الفني لمراجعة الأسباب أو تصحيح البيانات.
            </p>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  // Suspended View
  if (providerProfile && providerProfile.verification_status === 'suspended') {
    return (
      <DashboardLayout title="لوحة الحرفيين" description="تعليق الحساب">
        <Card className="dir-rtl text-right p-6 text-center max-w-xl mx-auto space-y-3">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">تم تعليق الحساب مؤقتاً</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              تم تعليق حسابك المهني مؤقتاً من قبل الإدارة بكفر الشيخ. يرجى مراجعة إشعاراتك أو التواصل مع المشرف لتسوية الموقف والالتزام بجودة العمل.
            </p>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  // Filter requests based on tabs
  const activeRequests = myRequests.filter((r) => r.status === 'accepted' || r.status === 'in_progress');
  const pastRequests = myRequests.filter((r) => r.status === 'completed' || r.status === 'cancelled');

  const activeTabCount = {
    available: availableRequests.length,
    active: activeRequests.length,
    history: pastRequests.length
  };

  return (
    <DashboardLayout
      title="منطقة الحرفيين والخدمات المنزلية"
      description="إدارة طلبيات الصيانة المباشرة، استقبال الطلبات، وسجل الخدمات الفنية بكفر الشيخ"
      badge={
        <Badge variant="emerald" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
          شريك حرفي معتمد وبجاهزية تامة
        </Badge>
      }
      headerActions={
        <Button
          onClick={() => loadProviderRequests(providerProfile!)}
          variant="outline"
          size="sm"
          icon={<RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />}
        >
          تحديث الطلبات
        </Button>
      }
      statsGrid={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{activeRequests.length}</div>
                <div className="text-xs font-semibold text-slate-500">طلبات جارية للتنفيذ</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{providerProfile?.jobs_completed_count}</div>
                <div className="text-xs font-semibold text-slate-500">مجموع الخدمات المنجزة</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">⭐ {providerProfile?.rating_average.toFixed(1)} / 5</div>
                <div className="text-xs font-semibold text-slate-500">التقييم العام الموثق</div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <Card className="dir-rtl text-right">
        <CardHeader>
          <Tabs
            tabs={[
              { id: 'available', label: 'طلبات جديدة متاحة بتخصصك', badge: activeTabCount.available.toString() },
              { id: 'active', label: 'مهامي النشطة والجارية', badge: activeTabCount.active.toString() },
              { id: 'history', label: 'الأرشيف والطلبات السابقة', badge: activeTabCount.history.toString() },
            ]}
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
          />
        </CardHeader>

        <CardContent>
          {isLoadingRequests ? (
            <div className="space-y-3 py-4">
              <Skeleton className="w-full h-16 rounded-xl" />
              <Skeleton className="w-full h-16 rounded-xl" />
            </div>
          ) : (
            <>
              {/* TAB 1: AVAILABLE REQUESTS */}
              {activeTab === 'available' && (
                <div className="space-y-3">
                  {availableRequests.length === 0 ? (
                    <EmptyState
                      title="لا توجد طلبات جديدة حالياً"
                      description="سيتم سرد أي طلبات صيانة يرفعها العملاء في كفر الشيخ وتطابق تخصصاتك المسجلة هنا فوراً."
                      icon={<Wrench className="w-8 h-8 text-slate-400" />}
                    />
                  ) : (
                    availableRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {req.service?.title_ar || 'خدمة صيانة مخصصة'}
                            </span>
                            <Badge variant="warning">متاح للقبول</Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {new Date(req.scheduled_for || req.created_at).toLocaleDateString('ar-EG')}
                              </span>
                            </span>

                            {req.agreed_price && (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                السعر المعروض: {req.agreed_price} ج.م
                              </span>
                            )}
                          </div>

                          {req.notes && (
                            <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-2 max-w-2xl leading-relaxed">
                              {req.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <Button
                            onClick={() => triggerRequestAction(req, 'accepted', 'قبول طلب الصيانة والمتابعة')}
                            variant="primary"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            قبول وتأكيد العمل
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: ACTIVE MY REQUESTS */}
              {activeTab === 'active' && (
                <div className="space-y-3">
                  {activeRequests.length === 0 ? (
                    <EmptyState
                      title="لا تملك أي مهام جارية حالياً"
                      description="يمكنك تصفح وقبول الطلبات المتاحة بتخصصك للبدء بالعمل الميداني والخدمة."
                      icon={<Briefcase className="w-8 h-8 text-slate-400" />}
                    />
                  ) : (
                    activeRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {req.service?.title_ar || 'خدمة صيانة مخصصة'}
                            </span>
                            {req.status === 'accepted' ? (
                              <Badge variant="purple">تم قبولك ومجدول</Badge>
                            ) : (
                              <Badge variant="info">قيد التنفيذ الميداني</Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {new Date(req.scheduled_for || req.created_at).toLocaleString('ar-EG')}
                              </span>
                            </span>

                            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-bold">
                              العميل: {(req as any).customer?.full_name || 'عميل كفراوي'}
                            </span>

                            {req.agreed_price && (
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                                التكلفة المتفق عليها: {req.agreed_price} ج.م
                              </span>
                            )}
                          </div>

                          {req.notes && (
                            <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 mt-2 max-w-2xl leading-relaxed">
                              {req.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {/* Track logs */}
                          <Button
                            onClick={() => handleOpenHistory(req)}
                            variant="outline"
                            size="sm"
                            icon={<History className="w-4 h-4" />}
                          >
                            تاريخ الحالة
                          </Button>

                          {/* Accept to In Progress */}
                          {req.status === 'accepted' && (
                            <Button
                              onClick={() => triggerRequestAction(req, 'in_progress', 'بدء الزيارة والتنفيذ')}
                              variant="primary"
                              size="sm"
                              icon={<Play className="w-4 h-4" />}
                            >
                              بدء التنفيذ
                            </Button>
                          )}

                          {/* In Progress to Completed */}
                          {req.status === 'in_progress' && (
                            <Button
                              onClick={() => triggerRequestAction(req, 'completed', 'إتمام وتسليم الخدمة بنجاح')}
                              variant="success"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              icon={<Check className="w-4 h-4" />}
                            >
                              إتمام العمل والإنهاء
                            </Button>
                          )}

                          {/* Cancel / Apologize */}
                          {(req.status === 'accepted' || req.status === 'pending') && (
                            <Button
                              onClick={() => triggerRequestAction(req, 'cancelled', 'الاعتذار وإلغاء الطلب')}
                              variant="danger"
                              size="sm"
                            >
                              اعتذار وإلغاء
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: PAST HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {pastRequests.length === 0 ? (
                    <EmptyState
                      title="الأرشيف فارغ"
                      description="سجل الحالات والطلبات المغلقة أو المكتملة يظهر هنا للرجوع والتدقيق المالي."
                      icon={<Wrench className="w-8 h-8 text-slate-400" />}
                    />
                  ) : (
                    pastRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {req.service?.title_ar || 'خدمة صيانة مخصصة'}
                            </span>
                            {req.status === 'completed' ? (
                              <Badge variant="emerald">مكتمل ومسدد</Badge>
                            ) : (
                              <Badge variant="danger">ملغي ومغلق</Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-semibold pt-1">
                            <span>{new Date(req.updated_at).toLocaleDateString('ar-EG')}</span>
                            <span>العميل: {(req as any).customer?.full_name || 'عميل كفراوي'}</span>
                            {req.agreed_price && (
                              <span className="font-bold text-slate-500">
                                السعر: {req.agreed_price} ج.م
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => handleOpenHistory(req)}
                          variant="outline"
                          size="sm"
                          icon={<History className="w-4 h-4" />}
                        >
                          عرض تفاصيل الإغلاق
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation of Status Transitions Modal */}
      <Modal
        isOpen={!!selectedRequestForAction}
        onClose={() => setSelectedRequestForAction(null)}
        title="تأكيد تعديل حالة الخدمة"
        size="md"
      >
        {selectedRequestForAction && (
          <div className="space-y-4 text-right dir-rtl">
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              أنت على وشك القيام بالإجراء التالي للطلب: ({selectedRequestForAction.actionLabel}). يرجى كتابة ملاحظات تحديث الزيارة لتأكيدها وتخزينها في السجل التاريخي:
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات التحديث أو الزيارة الفنية</label>
              <textarea
                rows={3}
                required={selectedRequestForAction.actionType === 'cancelled'}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="اكتب ملاحظاتك هنا (مثل: تم التنسيق مع العميل، جاري إعداد الأدوات، أو كتابة سبب الاعتذار)..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {selectedRequestForAction.actionType === 'cancelled' && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">يجب كتابة سبب الإلغاء/الاعتذار للعميل.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRequestForAction(null)}
                disabled={isPerformingAction}
              >
                التراجع
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmRequestAction}
                isLoading={isPerformingAction}
                disabled={selectedRequestForAction.actionType === 'cancelled' && !actionNotes.trim()}
              >
                تأكيد وتنفيذ الإجراء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Request History Modal for Provider */}
      <Modal
        isOpen={!!selectedRequestForHistory}
        onClose={() => setSelectedRequestForHistory(null)}
        title="الجدول الزمني وحالة الطلب"
        size="md"
      >
        {selectedRequestForHistory && (
          <div className="space-y-4 text-right dir-rtl">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-xs font-bold text-slate-900">
                {selectedRequestForHistory.service?.title_ar || 'خدمة صيانة مخصصة'}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                معرف التتبع: {selectedRequestForHistory.id}
              </div>
            </div>

            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pt-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>أحداث تتبع الحالة الميدانية للطلب:</span>
            </div>

            {isLoadingHistory ? (
              <div className="space-y-3 py-4">
                <Skeleton className="w-full h-8 rounded-md" />
                <Skeleton className="w-full h-8 rounded-md" />
              </div>
            ) : requestHistory.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">لا توجد سجلات حالات مؤرشفة لهذا العمل.</div>
            ) : (
              <div className="relative border-r border-slate-200 pr-4 mr-2 space-y-4">
                {requestHistory.map((hist) => (
                  <div key={hist.id} className="relative">
                    <div className="absolute -right-[21px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {hist.status === 'pending' && <Badge variant="warning">قيد المراجعة</Badge>}
                          {hist.status === 'accepted' && <Badge variant="purple">مجدول</Badge>}
                          {hist.status === 'in_progress' && <Badge variant="info">جاري العمل</Badge>}
                          {hist.status === 'completed' && <Badge variant="emerald">منجز</Badge>}
                          {hist.status === 'cancelled' && <Badge variant="danger">ملغي</Badge>}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(hist.created_at).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {hist.notes || 'لا توجد ملاحظات إضافية.'}
                      </p>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        بواسطة: {hist.changer_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setSelectedRequestForHistory(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};
