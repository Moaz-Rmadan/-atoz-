import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../../context/AuthContext';
import {
  ShoppingBag,
  Store,
  Tag,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  History,
  Phone,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';
import { merchantApi, Product, ProductCategory, Order } from '../../merchant/services/merchantApi';
import { supabase } from '../../../lib/supabase';

interface CartItem {
  product: Product;
  quantity: number;
}

export const MarketplacePage: React.FC = () => {
  const { user } = useAuth();

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);

  // UI Control State
  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('kafrawy_marketplace_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCart, setShowCart] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('kafrawy_marketplace_cart', JSON.stringify(cart));
  }, [cart]);

  const loadMarketplaceData = useCallback(async () => {
    setErrorMsg(null);
    try {
      const cats = await merchantApi.getProductCategories();
      setCategories(cats);

      const prods = await merchantApi.getAllActiveProducts(
        selectedCategory === 'all' ? undefined : selectedCategory,
        searchQuery.trim() || undefined
      );
      setProducts(prods);

      if (user?.id) {
        let customerOrders: any[] = [];
        try {
          const { isSupabaseConfigured } = await import('../../../lib/supabase');
          if (isSupabaseConfigured()) {
            const res = await supabase
              .from('orders')
              .select('*, merchants(store_name)')
              .eq('customer_id', user.id)
              .order('created_at', { ascending: false });

            if (!res.error && res.data) {
              customerOrders = res.data.map((o: any) => ({
                ...o,
                merchant_store_name: o.merchants?.store_name || 'متجر كفراوي المعتمد',
                customer_profile: {
                  full_name: user.full_name || 'العميل',
                  phone_number: user.phone_number || '',
                },
                order_items: [],
              }));
            }
          }
        } catch (e) {
          console.error('Error fetching real customer orders:', e);
        }

        // Mock fallback if empty
        if (customerOrders.length === 0) {
          customerOrders = [
            {
              id: 'MOCK-ORD-778',
              merchant_id: 'merchant-1',
              merchant_store_name: 'سوبر ماركت الفرسان',
              customer_id: user.id,
              customer_profile: { full_name: user.full_name || 'العميل', phone_number: user.phone_number || '01000000000' },
              status: 'delivered',
              total_amount: 350,
              payment_method: 'cash',
              payment_status: 'paid',
              delivery_address: 'كفر الشيخ، تقسيم المحافظة',
              order_notes: '',
              created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
              updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
              order_items: []
            }
          ];
        }
        setPastOrders(customerOrders);
      }
    } catch (e: any) {
      setErrorMsg('حدث خطأ أثناء تحميل بيانات السوق. يرجى المحاولة لاحقاً.');
    } finally {
      setIsInitializing(false);
      setIsRefreshing(false);
    }
  }, [user, selectedCategory, searchQuery]);

  useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMarketplaceData();
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= (product.stock_quantity || 99)) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = item.quantity + delta;
            if (newQ > (item.product.stock_quantity || 99)) return item;
            return { ...item, quantity: newQ };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const totalCartValue = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!user) {
      alert('يجب تسجيل الدخول لإتمام عملية الشراء.');
      return;
    }
    if (cart.length === 0) return;

    setIsSubmittingOrder(true);
    setOrderSuccess(null);
    setErrorMsg(null);

    try {
      const merchantIds: string[] = Array.from(new Set(cart.map((item) => item.product.merchant_id)));
      for (const mId of merchantIds) {
        const merchantCart = cart.filter((i) => i.product.merchant_id === mId);
        const orderData = {
          merchant_id: String(mId),
          customer_id: user.id,
          total_amount: merchantCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
          notes: orderNotes,
          items: merchantCart.map(item => ({
            product_id: item.product.id,
            product_title: item.product.title_ar,
            price: item.product.price,
            quantity: item.quantity
          }))
        };
        await merchantApi.createCustomerOrder(orderData);
      }

      setOrderSuccess('تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً للتوصيل.');
      clearCart();
      setShowCart(false);
      setOrderNotes('');
      setActiveTab('orders');
      loadMarketplaceData();
    } catch (e: any) {
      setErrorMsg('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 pt-2 h-full flex flex-col">
      {/* Header & Sticky Search */}
      <section className="sticky top-0 z-10 bg-slate-50 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">سوق كفراوي 🛍️</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">تسوق من أفضل محلات كفر الشيخ</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 active:scale-95 transition-transform cursor-pointer"
          >
            <ShoppingCart className="w-6 h-6" />
            <AnimatePresence>
              {cartItemCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-sm"
                >
                  {cartItemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {activeTab === 'browse' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="ابحث عن منتج..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={handleRefresh}
              className={`w-12 h-[46px] bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform cursor-pointer ${isRefreshing ? 'opacity-50' : ''}`}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 rounded-2xl mb-2">
        <button
          onClick={() => setActiveTab('browse')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'browse' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          تصفح المنتجات
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'orders' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          طلباتي السابقة
        </button>
      </div>

      {orderSuccess && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex gap-3 border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{orderSuccess}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl flex gap-3 border border-rose-100">
          <Filter className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{errorMsg}</p>
        </div>
      )}

      {/* MAIN CONTENT */}
      {activeTab === 'browse' ? (
        <>
          {/* Categories Horizontal Scroll */}
          <section>
            <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 custom-scrollbar-hide snap-x">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap snap-center transition-colors cursor-pointer ${
                  selectedCategory === 'all' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                الكل
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap snap-center transition-colors cursor-pointer ${
                    selectedCategory === cat.id ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat.name_ar}
                </button>
              ))}
            </div>
          </section>

          {/* Products List */}
          <section className="flex-1 pb-16">
            {isInitializing ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-3 border border-slate-100 shadow-sm animate-pulse">
                    <div className="w-full h-32 bg-slate-200 rounded-2xl mb-3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                    <div className="h-8 bg-slate-200 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-sm mt-8">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">لا توجد منتجات</h3>
                <p className="text-sm text-slate-500">لم يتم العثور على منتجات مطابقة لبحثك.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {products.map((product) => {
                  const cartItem = cart.find(c => c.product.id === product.id);
                  return (
                    <motion.div 
                      key={product.id} 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl p-3 shadow-sm border border-slate-100 flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-full h-28 sm:h-32 rounded-2xl bg-slate-100 mb-3 overflow-hidden relative group">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                          {!product.is_available && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                              <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-bold">نفدت الكمية</span>
                            </div>
                          )}
                        </div>
                        <div className="mb-3">
                          <p className="text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
                            <Store className="w-3 h-3" />
                            متجر كفراوي
                          </p>
                          <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight">
                            {product.name_ar}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="text-emerald-600 font-black text-sm mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {product.price} ج.م
                        </div>
                        
                        {cartItem ? (
                          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
                            <button
                              onClick={() => updateCartQuantity(product.id, -1)}
                              className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-600 shadow-sm active:scale-90 transition-transform cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(product.id, 1)}
                              disabled={cartItem.quantity >= (product.stock_quantity || 99)}
                              className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm active:scale-90 transition-transform cursor-pointer disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            disabled={!product.is_available}
                            className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            أضف للسلة
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="space-y-4 pb-16">
          {pastOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-sm mt-8">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">لا توجد طلبات سابقة</h3>
              <p className="text-sm text-slate-500">لم تقم بإجراء أي عمليات شراء من السوق حتى الآن.</p>
              <button 
                onClick={() => setActiveTab('browse')}
                className="mt-6 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer"
              >
                تصفح المنتجات
              </button>
            </div>
          ) : (
            pastOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 mb-1">طلب من: {order.merchant_store_name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{new Date(order.created_at).toLocaleString('ar-EG')}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status === 'pending' ? 'قيد الانتظار' :
                     order.status === 'processing' ? 'جاري التجهيز' :
                     order.status === 'ready_for_pickup' ? 'جاهز للاستلام' :
                     order.status === 'out_for_delivery' ? 'في الطريق' :
                     order.status === 'delivered' ? 'تم التوصيل' : 'ملغي'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">الإجمالي:</span>
                  <span className="font-black text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{order.total_amount} ج.م</span>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* CART BOTTOM SHEET */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowCart(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 z-10 shadow-2xl h-[85vh] flex flex-col pb-safe"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
              
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-xl font-bold text-slate-900">سلة المشتريات</h3>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> إفراغ
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="w-10 h-10 text-slate-300" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">السلة فارغة</h4>
                  <p className="text-sm text-slate-500">أضف بعض المنتجات من السوق أولاً</p>
                  <button onClick={() => setShowCart(false)} className="mt-6 bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer">
                    العودة للتسوق
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar-hide">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 bg-white p-3 border border-slate-100 rounded-2xl shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                          {item.product.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name_ar} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-slate-300" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 truncate mb-1">{item.product.name_ar}</h4>
                          <p className="text-emerald-600 font-black text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.product.price} ج.م</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-200">
                           <button
                             onClick={() => updateCartQuantity(item.product.id, 1)}
                             disabled={item.quantity >= (item.product.stock_quantity || 99)}
                             className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center text-slate-600 cursor-pointer disabled:opacity-50"
                           >
                             <Plus className="w-3 h-3" />
                           </button>
                           <span className="font-bold text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.quantity}</span>
                           <button
                             onClick={() => {
                               if (item.quantity === 1) removeFromCart(item.product.id);
                               else updateCartQuantity(item.product.id, -1);
                             }}
                             className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center text-rose-500 cursor-pointer"
                           >
                             {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                           </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 mb-2">ملاحظات الطلب (اختياري)</label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="اكتب أي تعليمات خاصة للمتجر أو المندوب..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none resize-none h-20"
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-2 shrink-0 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-slate-500">الإجمالي:</span>
                      <span className="text-xl font-black text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{totalCartValue} ج.م</span>
                    </div>
                    <button
                      onClick={handleCheckout}
                      disabled={isSubmittingOrder}
                      className="w-full py-4 bg-slate-900 text-white font-bold text-base rounded-2xl active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                    >
                      {isSubmittingOrder ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'تأكيد الطلب والدفع عند الاستلام'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
