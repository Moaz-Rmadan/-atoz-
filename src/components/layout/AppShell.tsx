import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car,
  Wrench,
  Store,
  Bell,
  Home,
  MapPin,
  ChevronLeft,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

export type ActiveView =
  | 'login'
  | 'register'
  | 'forgot'
  | 'reset'
  | 'customer'
  | 'services_discovery'
  | 'customer_dashboard'
  | 'marketplace'
  | 'driver'
  | 'provider'
  | 'merchant'
  | 'employer'
  | 'admin'
  | 'settings'
  | 'gates_demo';

interface AppShellProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  children,
}) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isLocationSheetOpen, setIsLocationSheetOpen] = useState(false);

  // Mock Notifications list for design shell
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'أهلاً بك في كفراوي',
      body: 'استكشف الخدمات المتاحة الآن في مدينتك.',
      time: 'منذ 5 دقائق',
      unread: true,
      type: 'success',
    }
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const markAllNotifsAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  const bottomNavItems: NavItem[] = [
    { id: 'customer', label: 'الرئيسية', icon: <Home className="w-6 h-6" /> },
    { id: 'services_discovery', label: 'الخدمات', icon: <Wrench className="w-6 h-6" /> },
    { id: 'marketplace', label: 'السوق', icon: <Store className="w-6 h-6" /> },
    { id: 'driver', label: 'كابتن', icon: <Car className="w-6 h-6" /> },
    { id: 'customer_dashboard', label: 'حسابي', icon: <UserCheck className="w-6 h-6" /> },
  ];

  const isAuthPage = ['login', 'register', 'forgot', 'reset'].includes(currentView);

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-900 dir-rtl pb-[80px] sm:pb-0 overflow-x-hidden flex flex-col relative w-full lg:max-w-md lg:mx-auto lg:border-x lg:border-slate-200 lg:shadow-2xl">
      {/* MOBILE APP HEADER (Sticky Top) */}
      {!isAuthPage && (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-4 h-16 w-full">
            {/* Logo / Location */}
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md cursor-pointer"
                onClick={() => onNavigate('customer')}
              >
                ك
              </div>
              <div 
                className="flex flex-col cursor-pointer"
                onClick={() => setIsLocationSheetOpen(true)}
              >
                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                  موقعك الحالي <ChevronLeft className="w-3 h-3 -rotate-90" />
                </span>
                <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  كفر البطيخ، دمياط
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isAdmin() && (
                <button
                  onClick={() => onNavigate('admin')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
                  title="لوحة الإدارة"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>الإدارة</span>
                </button>
              )}
              <button
                onClick={() => setIsNotifDrawerOpen(true)}
                className="relative p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                )}
              </button>
              {isAuthenticated ? (
                <div onClick={() => onNavigate('customer_dashboard')} className="cursor-pointer">
                  <Avatar fallback={user?.full_name?.charAt(0) || 'U'} className="w-9 h-9 shadow-sm" />
                </div>
              ) : (
                <button onClick={() => onNavigate('login')} className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center cursor-pointer">
                  <UserCheck className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full pb-6"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTTOM NAVIGATION (Mobile Fixed) */}
      {!isAuthPage && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] lg:w-[448px] lg:mx-auto">
          <div className="flex items-center justify-around h-[72px] px-2 pb-safe">
            {bottomNavItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all relative cursor-pointer ${
                    isActive ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <motion.div
                    animate={{ y: isActive ? -2 : 0 }}
                    className="relative z-10"
                  >
                    {item.icon}
                  </motion.div>
                  <span className={`text-[10px] font-bold z-10 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute inset-0 bg-emerald-50 rounded-2xl scale-75 opacity-100 pointer-events-none"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LOCATION BOTTOM SHEET */}
      <AnimatePresence>
        {isLocationSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsLocationSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 z-10 shadow-2xl h-[70vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
              <h3 className="text-xl font-bold text-slate-900 mb-4">تحديد الموقع</h3>
              
              <div className="relative mb-6 shrink-0">
                <input 
                  type="text" 
                  placeholder="ابحث عن منطقتك..." 
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 pr-12 pl-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900"
                />
                <MapPin className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {['وسط البلد', 'المحطة', 'طريق رأس البر', 'دمياط الجديدة'].map((loc, i) => (
                  <button key={i} onClick={() => setIsLocationSheetOpen(false)} className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl active:scale-95 transition-transform text-right cursor-pointer">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">كفر البطيخ، {loc}</h4>
                      <p className="text-xs text-slate-500">تم الحفظ مؤخراً</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <Button onClick={() => setIsLocationSheetOpen(false)} className="w-full py-6 mt-4 rounded-2xl bg-slate-900 text-white font-bold text-base shrink-0">
                تأكيد الموقع
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS BOTTOM SHEET (Instead of Drawer) */}
      <AnimatePresence>
        {isNotifDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsNotifDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 z-10 shadow-2xl h-[80vh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0" />
              
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-xl font-bold text-slate-900">الإشعارات</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotifsAsRead}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    تحديد كمقروء
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      n.unread
                        ? 'bg-blue-50/50 border-blue-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 bg-white px-2 py-1 rounded-md">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{n.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
