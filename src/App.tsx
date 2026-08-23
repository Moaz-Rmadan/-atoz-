import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGate } from './components/auth/RoleGate';
import { PermissionGate } from './components/auth/PermissionGate';
import { AppShell, ActiveView } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AccountSettingsPage } from './modules/profile/pages/AccountSettingsPage';
import { AdminRbacPage } from './modules/admin/pages/AdminRbacPage';
import { ProviderDashboardPage } from './modules/provider/pages/ProviderDashboardPage';
import { MerchantDashboardPage } from './modules/merchant/pages/MerchantDashboardPage';
import { EmployerDashboardPage } from './modules/employer/pages/EmployerDashboardPage';

// Customer Pages
import { CustomerHomePage } from './modules/customer/pages/CustomerHomePage';
import { ServiceDiscoveryPage } from './modules/customer/pages/ServiceDiscoveryPage';
import { CustomerDashboardPage } from './modules/customer/pages/CustomerDashboardPage';
import { MarketplacePage } from './modules/customer/pages/MarketplacePage';
import { KafrawyGoPage } from './modules/customer/pages/KafrawyGoPage';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import {
  ShieldCheck,
  UserCheck,
  Car,
  CheckCircle2,
  Lock,
  Sparkles,
  Store,
  Wrench,
  Briefcase,
  RefreshCw,
  LogOut,
} from 'lucide-react';

function AppContent() {
  const { user, signOut, refreshProfile } = useAuth();
  const [currentView, setCurrentView] = useState<ActiveView>('customer');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  const handleNavigateZone = (zone: string, searchQuery?: string) => {
    if (searchQuery) {
      setServiceSearchQuery(searchQuery);
    }
    setCurrentView(zone as ActiveView);
  };

  return (
    <AppShell currentView={currentView} onNavigate={(view) => setCurrentView(view)}>
      {currentView === 'login' && (
        <div className="max-w-md mx-auto pt-6">
          <LoginPage
            onSwitchToRegister={() => setCurrentView('register')}
            onSwitchToForgotPassword={() => setCurrentView('forgot')}
            onSuccess={() => setCurrentView('customer')}
          />
        </div>
      )}

      {currentView === 'register' && (
        <div className="max-w-md mx-auto pt-6">
          <RegisterPage
            onSwitchToLogin={() => setCurrentView('login')}
            onSuccess={() => setCurrentView('customer')}
          />
        </div>
      )}

      {currentView === 'forgot' && (
        <div className="max-w-md mx-auto pt-6">
          <ForgotPasswordPage onBackToLogin={() => setCurrentView('login')} />
        </div>
      )}

      {currentView === 'reset' && (
        <div className="max-w-md mx-auto pt-6">
          <ResetPasswordPage onSuccess={() => setCurrentView('login')} />
        </div>
      )}

      {currentView === 'settings' && (
        <ProtectedRoute onNavigateToLogin={() => setCurrentView('login')}>
          <AccountSettingsPage />
        </ProtectedRoute>
      )}

      {/* Customer Home Page */}
      {currentView === 'customer' && (
        <CustomerHomePage onNavigateZone={handleNavigateZone} />
      )}

      {/* Service & Craftsmen Discovery Page */}
      {currentView === 'services_discovery' && (
        <ServiceDiscoveryPage
          initialSearchQuery={serviceSearchQuery}
          onBackToHome={() => setCurrentView('customer')}
          onNavigateToDashboard={() => setCurrentView('customer_dashboard')}
        />
      )}

      {/* Customer Personal Dashboard */}
      {currentView === 'customer_dashboard' && (
        <ProtectedRoute onNavigateToLogin={() => setCurrentView('login')}>
          <CustomerDashboardPage
            onNavigateToServices={() => setCurrentView('services_discovery')}
            onNavigateToGo={() => setCurrentView('driver')}
            onNavigateToMarketplace={() => setCurrentView('marketplace')}
          />
        </ProtectedRoute>
      )}

      {/* Kafrawy Marketplace */}
      {currentView === 'marketplace' && (
        <ProtectedRoute onNavigateToLogin={() => setCurrentView('login')}>
          <MarketplacePage />
        </ProtectedRoute>
      )}

      {/* Protected Driver Zone (Kafrawy Go) */}
      {currentView === 'driver' && (
        <ProtectedRoute
          onNavigateToLogin={() => setCurrentView('login')}
        >
          <KafrawyGoPage onBackToDashboard={() => setCurrentView('customer_dashboard')} />
        </ProtectedRoute>
      )}

      {/* Protected Provider Zone */}
      {currentView === 'provider' && (
        <ProtectedRoute
          allowedRoles={['provider', 'admin']}
          onNavigateToLogin={() => setCurrentView('login')}
        >
          <ProviderDashboardPage />
        </ProtectedRoute>
      )}

      {/* Protected Merchant Zone */}
      {currentView === 'merchant' && (
        <ProtectedRoute
          allowedRoles={['merchant', 'admin']}
          onNavigateToLogin={() => setCurrentView('login')}
        >
          <MerchantDashboardPage />
        </ProtectedRoute>
      )}

      {/* Protected Employer Zone */}
      {currentView === 'employer' && (
        <ProtectedRoute
          allowedRoles={['employer', 'admin']}
          onNavigateToLogin={() => setCurrentView('login')}
        >
          <EmployerDashboardPage />
        </ProtectedRoute>
      )}

      {/* Protected Admin Zone */}
      {currentView === 'admin' && (
        <ProtectedRoute
          allowedRoles={['admin']}
          onNavigateToLogin={() => setCurrentView('login')}
        >
          <AdminRbacPage />
        </ProtectedRoute>
      )}

      {/* RoleGate and PermissionGate Live Demo View */}
      {currentView === 'gates_demo' && (
        <ProtectedRoute onNavigateToLogin={() => setCurrentView('login')}>
          <div className="space-y-6 dir-rtl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                  <span>اختبار التحلل البرمجي عبر RoleGate و PermissionGate</span>
                </CardTitle>
                <CardDescription>
                  عرض عناصر الواجهة ديناميكياً بحسب الدور والصلاحية التي يملكها الحساب الحالي
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Roles Testing Section */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-r-4 border-emerald-600 pr-3">
                    1. اختبار RoleGate (حسب أصل الدور):
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Driver Gate */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-xs font-bold text-slate-500 mb-2">دور الكابتن (driver):</div>
                      <RoleGate
                        allowedRoles={['driver']}
                        fallback={
                          <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-semibold flex items-center gap-1.5">
                            <Lock className="w-4 h-4 shrink-0" />
                            <span>غير متوفر لعدم امتلاك دور driver</span>
                          </div>
                        }
                      >
                        <div className="text-xs text-blue-800 bg-blue-50 p-2.5 rounded-lg border border-blue-200 font-bold flex items-center gap-1.5">
                          <Car className="w-4 h-4 shrink-0" />
                          <span>محتوى ظاهر حصرياً للكباتن (Driver Widget)</span>
                        </div>
                      </RoleGate>
                    </div>

                    {/* Merchant Gate */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-xs font-bold text-slate-500 mb-2">دور التاجر (merchant):</div>
                      <RoleGate
                        allowedRoles={['merchant']}
                        fallback={
                          <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-semibold flex items-center gap-1.5">
                            <Lock className="w-4 h-4 shrink-0" />
                            <span>غير متوفر لعدم امتلاك دور merchant</span>
                          </div>
                        }
                      >
                        <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 font-bold flex items-center gap-1.5">
                          <Store className="w-4 h-4 shrink-0" />
                          <span>محتوى ظاهر حصرياً للتجار (Merchant Widget)</span>
                        </div>
                      </RoleGate>
                    </div>

                    {/* Admin Gate */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-xs font-bold text-slate-500 mb-2">دور المدير (admin):</div>
                      <RoleGate
                        allowedRoles={['admin']}
                        fallback={
                          <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 font-semibold flex items-center gap-1.5">
                            <Lock className="w-4 h-4 shrink-0" />
                            <span>غير متوفر لعدم امتلاك دور admin</span>
                          </div>
                        }
                      >
                        <div className="text-xs text-purple-800 bg-purple-50 p-2.5 rounded-lg border border-purple-200 font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 shrink-0" />
                          <span>محتوى ظاهر حصرياً للمدراء (Admin Widget)</span>
                        </div>
                      </RoleGate>
                    </div>
                  </div>
                </div>

                {/* Permissions Testing Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 border-r-4 border-blue-600 pr-3">
                    2. اختبار PermissionGate (حسب صلاحية التشغيل):
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Rides Accept Permission */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-xs font-bold text-slate-500 mb-2">صلاحية (rides:accept):</div>
                      <PermissionGate
                        requiredPermissions={['rides:accept']}
                        fallback={
                          <div className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                            زر قبول الرحلة مخفي لغياب صلاحية rides:accept
                          </div>
                        }
                      >
                        <Button fullWidth size="sm" variant="primary">
                          قبول طلب الرحلة الآن
                        </Button>
                      </PermissionGate>
                    </div>

                    {/* Jobs Post Permission */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-xs font-bold text-slate-500 mb-2">صلاحية (jobs:post):</div>
                      <PermissionGate
                        requiredPermissions={['jobs:post']}
                        fallback={
                          <div className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                            زر نشر الوظيفة مخفي لغياب صلاحية jobs:post
                          </div>
                        }
                      >
                        <Button fullWidth size="sm" variant="success">
                          إضافة إعلان وظيفة جديد
                        </Button>
                      </PermissionGate>
                    </div>

                    {/* Marketplace Sell Permission */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-xs font-bold text-slate-500 mb-2">صلاحية (marketplace:sell):</div>
                      <PermissionGate
                        requiredPermissions={['marketplace:sell']}
                        fallback={
                          <div className="text-xs text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                            زر إضافة منتج مخفي لغياب صلاحية marketplace:sell
                          </div>
                        }
                      >
                        <Button fullWidth size="sm" variant="purple">
                          إضافة منتج متجر جديد
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ProtectedRoute>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

