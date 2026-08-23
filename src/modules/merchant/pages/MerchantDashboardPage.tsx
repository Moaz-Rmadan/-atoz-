import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
  Store,
  ShoppingBag,
  TrendingUp,
  Package,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Clock,
  Eye,
  User,
  Phone,
  Tag,
  RefreshCw,
  EyeOff,
} from 'lucide-react';
import { merchantApi, MerchantProfile, ProductCategory, Product, Order, getAllowedNextStatuses, getStatusArabicLabel } from '../services/merchantApi';

export const MerchantDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Core State
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // UI Control State
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Store Registration Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreBio, setNewStoreBio] = useState('');
  const [isSubmittingStore, setIsSubmittingStore] = useState(false);

  // Product Modal/Form State
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('');
  const [productIsActive, setProductIsActive] = useState(true);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Selected Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Initial Data Fetching
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setErrorMsg(null);
    try {
      // 1. Fetch Merchant Profile
      const mProfile = await merchantApi.getMerchantProfile(user.id);
      setMerchant(mProfile);

      // 2. Fetch Product Categories
      const cats = await merchantApi.getProductCategories();
      setCategories(cats);

      if (mProfile) {
        // 3. Fetch products and orders
        const [prods, ords] = await Promise.all([
          merchantApi.getMerchantProducts(mProfile.id),
          merchantApi.getMerchantOrders(mProfile.id),
        ]);
        setProducts(prods);
        setOrders(ords);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'فشل تحميل بيانات المتجر.');
    } finally {
      setIsInitializing(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  // Register New Merchant Profile
  const handleRegisterStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newStoreName.trim()) return;

    setIsSubmittingStore(true);
    setErrorMsg(null);
    try {
      const created = await merchantApi.createMerchantProfile({
        profile_id: user.id,
        store_name: newStoreName.trim(),
        bio: newStoreBio.trim(),
      });
      setMerchant(created);
      await loadDashboardData();
    } catch (e: any) {
      setErrorMsg(e?.message || 'حدث خطأ أثناء إنشاء متجرك.');
    } finally {
      setIsSubmittingStore(false);
    }
  };

  // Open product form (Add or Edit)
  const openProductForm = (prod: Product | null = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProductTitle(prod.title_ar);
      setProductDesc(prod.description_ar || '');
      setProductPrice(prod.price.toString());
      setProductStock(prod.stock_quantity.toString());
      setProductCategoryId(prod.category_id);
      setProductIsActive(prod.is_active);
    } else {
      setEditingProduct(null);
      setProductTitle('');
      setProductDesc('');
      setProductPrice('');
      setProductStock('');
      setProductCategoryId(categories[0]?.id || '');
      setProductIsActive(true);
    }
    setShowProductForm(true);
  };

  // Submit Product Form
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !productTitle.trim() || !productPrice || !productStock) return;

    setIsSubmittingProduct(true);
    setErrorMsg(null);
    try {
      const payload = {
        merchant_id: merchant.id,
        category_id: productCategoryId,
        title_ar: productTitle.trim(),
        description_ar: productDesc.trim() || null,
        price: parseFloat(productPrice),
        stock_quantity: parseInt(productStock),
        is_active: productIsActive,
      };

      if (editingProduct) {
        await merchantApi.updateProduct(editingProduct.id, payload);
      } else {
        await merchantApi.addProduct(payload);
      }

      setShowProductForm(false);
      await loadDashboardData();
    } catch (e: any) {
      setErrorMsg(e?.message || 'حدث خطأ أثناء حفظ المنتج.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟')) return;
    try {
      await merchantApi.deleteProduct(id);
      await loadDashboardData();
    } catch (e: any) {
      alert(e?.message || 'فشل حذف المنتج.');
    }
  };

  // Update order status
  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    if (!user?.id) return;
    try {
      await merchantApi.updateOrderStatus(orderId, status, user.id);
      await loadDashboardData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (e: any) {
      alert(e?.message || 'تعذر تحديث حالة الطلب.');
    }
  };

  // Metrics calculations
  const totalProducts = products.length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + o.total_amount, 0);

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-bold">جاري تحميل لوحة التحكم للتاجر...</p>
        </div>
      </div>
    );
  }

  // Case 1: No Merchant Profile - Setup New Store Form
  if (!merchant) {
    return (
      <DashboardLayout
        title="تنشيط حساب التاجر (Marketplace)"
        description="خطوة واحدة فقط تفصلك عن إطلاق متجرك الإلكتروني في كفر الشيخ وعرض منتجاتك للجمهور"
        badge={
          <Badge variant="purple" icon={<Store className="w-3.5 h-3.5" />}>
            خطوات التسجيل والتأسيس
          </Badge>
        }
      >
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 dir-rtl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Store className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">إعداد وتنشيط متجرك الإلكتروني</h3>
            <p className="text-sm text-slate-500 mt-1">أدخل الاسم والهوية التجارية لمتجرك لبدء استقبال طلبيات الشراء</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleRegisterStore} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                اسم المتجر / العلامة التجارية *
              </label>
              <input
                type="text"
                required
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                placeholder="مثال: سوبر ماركت الهدى كفر الشيخ"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                وصف موجز للمتجر أو المنتجات
              </label>
              <textarea
                value={newStoreBio}
                onChange={(e) => setNewStoreBio(e.target.value)}
                rows={3}
                placeholder="مثال: متخصصون في المواد الغذائية الطازجة وتوصيلها للمنازل"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingStore}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmittingStore ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جاري تسجيل متجرك...</span>
                </>
              ) : (
                <>
                  <Store className="w-5 h-5" />
                  <span>تأسيس وتنشيط المتجر الآن</span>
                </>
              )}
            </button>
          </form>
        </div>
      </DashboardLayout>
    );
  }

  // Case 2: Store is awaiting admin approval
  const isPending = merchant.approval_status === 'pending';
  const isRejected = merchant.approval_status === 'rejected' || merchant.approval_status === 'suspended';

  return (
    <DashboardLayout
      title={merchant.store_name}
      description={merchant.bio || 'لوحة التاجر المتكاملة لإدارة المتجر والمنتجات'}
      badge={
        <Badge variant={isPending ? 'warning' : isRejected ? 'danger' : 'success'} icon={<Store className="w-3.5 h-3.5" />}>
          {isPending ? 'متجر معلق - بانتظار الاعتماد' : isRejected ? 'حساب متجر معلق' : 'تاجر معتمد ونشط'}
        </Badge>
      }
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />} onClick={handleRefresh}>
            تحديث
          </Button>
          {!isRejected && (
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => openProductForm(null)}>
              إضافة منتج جديد
            </Button>
          )}
        </div>
      }
      statsGrid={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{totalProducts}</div>
                <div className="text-xs font-semibold text-slate-500">منتجات المتجر الإجمالية</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{pendingOrdersCount}</div>
                <div className="text-xs font-semibold text-slate-500">طلبات انتظار المراجعة</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{totalRevenue.toLocaleString('ar-EG')} ج.م</div>
                <div className="text-xs font-semibold text-slate-500">إجمالي المبيعات المحققة</div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {/* Pending Approval notice banner */}
      {isPending && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 text-sm dir-rtl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold">متجرك التجاري معلّق وبانتظار تفعيل وموافقة الإدارة</p>
            <p className="text-xs mt-0.5 text-amber-800">
              يمكنك إضافة وإدارة المنتجات كالعادة الآن، ولكنها لن تظهر للمشترين في السوق العام إلا بعد قيام حساب إداري (Admin) بالموافقة على متجرك وتفعيله من لوحة تحكم الإدارة (Admin Panel).
            </p>
          </div>
        </div>
      )}

      {/* Rejected notice banner */}
      {isRejected && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-sm dir-rtl">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold">تم تعليق أو تعطيل متجرك مؤقتاً</p>
            <p className="text-xs mt-0.5 text-rose-800">
              يرجى التواصل مع الإشراف العام أو مراجعة لوحة المسؤولين لحل القضايا المتعلقة بمتجرك.
            </p>
          </div>
        </div>
      )}

      {/* Tab Switching */}
      <div className="flex border-b border-slate-200 dir-rtl gap-4 mb-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 font-bold text-sm transition-all relative cursor-pointer ${
            activeTab === 'products' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'
          }`}
        >
          المنتجات والمعروضات ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 font-bold text-sm transition-all relative cursor-pointer ${
            activeTab === 'orders' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'
          }`}
        >
          طلبيات المبيعات والمتابعة ({orders.length})
        </button>
      </div>

      {/* View 1: Products List */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden dir-rtl">
          {products.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-lg">لم تقم بإضافة أي منتجات حتى الآن</p>
              <p className="text-xs text-slate-400 mt-1">انقر على إضافة منتج جديد بالأعلى للبدء في ملء معروضات متجرك</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">المنتج</th>
                    <th className="p-4">التصنيف</th>
                    <th className="p-4">السعر</th>
                    <th className="p-4">المخزون المتوفر</th>
                    <th className="p-4">حالة العرض والنشاط</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{p.title_ar}</div>
                        {p.description_ar && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description_ar}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Tag className="w-3 h-3" />
                          {p.category?.name_ar || 'تصنيف عام'}
                        </span>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">{p.price} ج.م</td>
                      <td className="p-4 font-bold text-slate-600">
                        {p.stock_quantity === 0 ? (
                          <span className="text-rose-600 font-black">نفذت الكمية</span>
                        ) : (
                          <span>{p.stock_quantity} وحدة</span>
                        )}
                      </td>
                      <td className="p-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-full">
                            <Check className="w-3 h-3" /> معروض للبيع
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-bold bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-full">
                            <EyeOff className="w-3 h-3" /> مخفي / معلق
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openProductForm(p)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 2: Orders List */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden dir-rtl">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-lg">لا توجد أي طلبيات شراء حتى الآن</p>
              <p className="text-xs text-slate-400 mt-1">عند قيام المشترين بوضع منتجاتك في السلة والشراء، ستظهر هنا فوراً.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">رقم الطلب</th>
                    <th className="p-4">العميل</th>
                    <th className="p-4">مبلغ الفاتورة</th>
                    <th className="p-4">تاريخ الطلب</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="p-4 font-mono font-bold text-purple-700">#{o.id.slice(0, 8)}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{o.customer_profile?.full_name || 'عميل مجهول'}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {o.customer_profile?.phone_number || 'بدون هاتف'}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">{o.total_amount} ج.م</td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(o.created_at).toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 justify-start">
                            {o.status === 'pending' && <Badge variant="warning">قيد المراجعة</Badge>}
                            {o.status === 'confirmed' && <Badge variant="purple">تم تأكيد الطلب</Badge>}
                            {o.status === 'processing' && <Badge variant="info">جاري التحضير</Badge>}
                            {o.status === 'out_for_delivery' && <Badge variant="blue">خرج للتوصيل</Badge>}
                            {o.status === 'delivered' && <Badge variant="success">تم التوصيل</Badge>}
                            {o.status === 'cancelled' && <Badge variant="error">ملغي</Badge>}
                          </div>
                          
                          {/* Next allowed transition actions */}
                          <div className="flex flex-wrap gap-1">
                            {getAllowedNextStatuses(o.status).map((nextStatus) => {
                              const isCancel = nextStatus === 'cancelled';
                              let label = '';
                              if (nextStatus === 'confirmed') label = 'تأكيد الطلب';
                              else if (nextStatus === 'processing') label = 'بدء التجهيز';
                              else if (nextStatus === 'out_for_delivery') label = 'خرج للتوصيل';
                              else if (nextStatus === 'delivered') label = 'تم التوصيل';
                              else if (nextStatus === 'cancelled') label = 'إلغاء الطلب';
                              
                              return (
                                <button
                                  key={nextStatus}
                                  onClick={() => handleUpdateStatus(o.id, nextStatus)}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isCancel
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> التفاصيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Product Add/Edit Form Overlay */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs dir-rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h4 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد لمعروضات متجرك'}
              </h4>
              <button
                onClick={() => setShowProductForm(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المنتج بالعربية *</label>
                <input
                  type="text"
                  required
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder="مثال: كيلو جبنة بيضاء طبيعية"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف ومميزات المنتج</label>
                <textarea
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  rows={2}
                  placeholder="مواصفات إضافية، الحجم، الوزن، بلد المنشأ..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">السعر بالجنيه المصري *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="75"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الكمية المتوفرة بالمخزون *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    placeholder="25"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تصنيف منتجات السوق *</label>
                <select
                  required
                  value={productCategoryId}
                  onChange={(e) => setProductCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm focus:outline-none text-slate-900"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prodActive"
                  checked={productIsActive}
                  onChange={(e) => setProductIsActive(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <label htmlFor="prodActive" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
                  عرض وتفعيل هذا المنتج للجمهور فوراً في المتجر
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProduct ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري حفظ المنتج...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>حفظ وبيانات المنتج</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View Order Details Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs dir-rtl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-lg font-bold text-slate-900">تفاصيل الفاتورة والطلب #{selectedOrder.id.slice(0, 8)}</h4>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer summary */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>اسم المشتري: {selectedOrder.customer_profile?.full_name || 'عميل كفراوي'}</span>
                </div>
                <div className="text-slate-500 flex items-center gap-1">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>رقم التواصل: {selectedOrder.customer_profile?.phone_number || 'غير متوفر'}</span>
                </div>
                {selectedOrder.notes && (
                  <div className="mt-2 p-2 bg-purple-50/50 border border-purple-100 rounded-lg text-purple-900">
                    <strong>ملاحظات التوصيل:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">المنتجات المطلوبة</div>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl max-h-48 overflow-y-auto">
                  {selectedOrder.order_items?.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/40">
                      <div>
                        <div className="font-bold text-slate-900">{item.product_title_snapshot}</div>
                        <div className="text-slate-500 mt-0.5">
                          {item.quantity} وحدة × {item.unit_price_at_purchase} ج.م
                        </div>
                      </div>
                      <div className="font-extrabold text-slate-900">{item.total_price} ج.م</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total amount */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 border-t border-slate-100 rounded-xl">
                <div className="font-bold text-slate-700">المبلغ الإجمالي المستحق:</div>
                <div className="text-lg font-black text-purple-700">{selectedOrder.total_amount} ج.م</div>
              </div>

              {/* Quick Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">الحالة الحالية:</span>
                  {selectedOrder.status === 'pending' && <Badge variant="warning">قيد المراجعة</Badge>}
                  {selectedOrder.status === 'confirmed' && <Badge variant="purple">تم تأكيد الطلب</Badge>}
                  {selectedOrder.status === 'processing' && <Badge variant="info">جاري التحضير</Badge>}
                  {selectedOrder.status === 'out_for_delivery' && <Badge variant="blue">خرج للتوصيل</Badge>}
                  {selectedOrder.status === 'delivered' && <Badge variant="success">تم التوصيل</Badge>}
                  {selectedOrder.status === 'cancelled' && <Badge variant="error">ملغي</Badge>}

                  {getAllowedNextStatuses(selectedOrder.status).map((nextStatus) => {
                    const isCancel = nextStatus === 'cancelled';
                    let label = '';
                    if (nextStatus === 'confirmed') label = 'تأكيد الطلب';
                    else if (nextStatus === 'processing') label = 'بدء التجهيز';
                    else if (nextStatus === 'out_for_delivery') label = 'خرج للتوصيل';
                    else if (nextStatus === 'delivered') label = 'تم التوصيل';
                    else if (nextStatus === 'cancelled') label = 'إلغاء الطلب';

                    return (
                      <button
                        key={nextStatus}
                        onClick={() => handleUpdateStatus(selectedOrder.id, nextStatus)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isCancel
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
