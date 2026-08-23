import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchCustomerServiceRequests,
  fetchCustomerRides,
  fetchCustomerOrders,
} from '../services/customerApi';
import { Avatar } from '../../../components/ui/Avatar';
import { 
  UserCheck, 
  MapPin, 
  Car, 
  Wrench, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  ChevronLeft,
  Phone,
  ShieldCheck,
  Star,
  Activity,
  History
} from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { user, signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'rides' | 'orders'>('overview');
  const [services, setServices] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [srv, rds, ord] = await Promise.all([
        fetchCustomerServiceRequests(user.id),
        fetchCustomerRides(user.id),
        fetchCustomerOrders(user.id)
      ]);
      setServices(srv);
      setRides(rds);
      setOrders(ord);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'accepted':
      case 'in_progress':
      case 'out_for_delivery':
      case 'driver_assigned':
      case 'in_transit': return 'bg-blue-100 text-blue-700';
      case 'completed':
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled':
      case 'rejected': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: 'قيد الانتظار',
      accepted: 'تم القبول',
      in_progress: 'جاري التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      rejected: 'مرفوض',
      delivered: 'تم التوصيل',
      out_for_delivery: 'في الطريق',
      driver_assigned: 'في الطريق إليك',
      in_transit: 'رحلة جارية'
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6 pb-6 h-full flex flex-col">
      {/* Profile Header */}
      <section className="bg-slate-900 text-white rounded-b-[40px] px-6 pt-6 pb-12 -mx-4 sm:mx-0 sm:rounded-3xl sm:mt-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 20%)', backgroundSize: '20px 20px' }}></div>
        
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <Avatar 
            fallback={user?.full_name?.charAt(0) || 'U'} 
            className="w-20 h-20 text-2xl font-black bg-white text-slate-900 shadow-md border-4 border-white/20"
          />
          <div>
            <h2 className="text-xl font-black mb-1 flex items-center gap-2">
              {user?.full_name || 'حساب العميل'}
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </h2>
            <p className="text-sm font-medium text-white/60 mb-2 font-mono">{user?.phone_number || 'بدون رقم'}</p>
            <div className="flex items-center gap-1 bg-white/10 w-max px-2 py-1 rounded-lg backdrop-blur-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold">4.9 تقييم الحساب</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Overlay */}
      <div className="px-2 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl p-4 shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center justify-between">
           <div className="flex flex-col items-center flex-1 border-l border-slate-100">
             <span className="text-2xl font-black text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rides.length}</span>
             <span className="text-[10px] font-bold text-slate-500">رحلات</span>
           </div>
           <div className="flex flex-col items-center flex-1 border-l border-slate-100">
             <span className="text-2xl font-black text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{services.length}</span>
             <span className="text-[10px] font-bold text-slate-500">خدمات</span>
           </div>
           <div className="flex flex-col items-center flex-1">
             <span className="text-2xl font-black text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{orders.length}</span>
             <span className="text-[10px] font-bold text-slate-500">طلبات سوق</span>
           </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <section className="px-2">
        <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar-hide snap-x">
          {[
            { id: 'overview', label: 'ملخص الحساب', icon: <Activity className="w-4 h-4" /> },
            { id: 'rides', label: 'الرحلات', icon: <Car className="w-4 h-4" /> },
            { id: 'services', label: 'الصيانة', icon: <Wrench className="w-4 h-4" /> },
            { id: 'orders', label: 'السوق', icon: <ShoppingBag className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold whitespace-nowrap snap-center transition-colors cursor-pointer ${
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Content Area */}
      <section className="flex-1 px-2 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {activeTab === 'overview' && (
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm mb-4 px-1">الإعدادات والمساعدة</h3>
                
                <button className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-95 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600"><MapPin className="w-5 h-5" /></div>
                    <span className="font-bold text-sm text-slate-900">العناوين المحفوظة</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                
                <button className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-95 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600"><Phone className="w-5 h-5" /></div>
                    <span className="font-bold text-sm text-slate-900">المساعدة والدعم الفني</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>

                <button className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-95 transition-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600"><Settings className="w-5 h-5" /></div>
                    <span className="font-bold text-sm text-slate-900">تعديل الملف الشخصي</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                
                <button 
                  onClick={signOut}
                  className="w-full mt-8 bg-rose-50 text-rose-600 p-4 rounded-2xl border border-rose-100 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <LogOut className="w-5 h-5" /> تسجيل الخروج
                </button>
              </div>
            )}

            {['rides', 'services', 'orders'].includes(activeTab) && (
              <div className="space-y-4">
                {isLoading ? (
                  [1,2].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 animate-pulse" />)
                ) : (
                  (() => {
                    const data = activeTab === 'rides' ? rides : activeTab === 'services' ? services : orders;
                    if (data.length === 0) return (
                      <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-sm mt-4">
                        <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="font-bold text-slate-900 mb-1">لا يوجد سجل حالي</h3>
                        <p className="text-xs text-slate-500">لم تقم بإجراء أي عمليات هنا بعد.</p>
                      </div>
                    );
                    return data.map((item: any) => (
                      <div key={item.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono mb-1 block">
                              {new Date(item.created_at).toLocaleDateString('ar-EG')}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900">
                              {activeTab === 'rides' ? `رحلة كفراوي Go` : activeTab === 'services' ? item.catalog_services?.name_ar || 'خدمة صيانة' : `طلب من ${item.merchant_store_name || 'سوق كفراوي'}`}
                            </h4>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                          {activeTab === 'rides' && (
                            <div className="flex flex-col gap-2">
                               <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500" /> {item.pickup_address_text || 'نقطة الانطلاق'}
                               </div>
                               <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                 <div className="w-2 h-2 rounded-full bg-rose-500" /> {item.dropoff_address_text || 'الوجهة'}
                               </div>
                            </div>
                          )}
                          {activeTab === 'services' && (
                            <p className="text-xs font-bold text-slate-600 line-clamp-2">الوصف: {item.problem_description || 'لا يوجد'}</p>
                          )}
                          {activeTab === 'orders' && (
                            <p className="text-xs font-bold text-slate-600">القيمة: <span className="font-mono text-emerald-600">{item.total_amount} ج.م</span></p>
                          )}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

    </div>
  );
};
