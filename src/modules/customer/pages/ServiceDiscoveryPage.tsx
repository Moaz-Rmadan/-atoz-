import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ServiceCategory,
  CatalogService,
  ServiceDiscoveryFilter,
} from '../../../types/customer';
import {
  fetchServiceCategories,
  fetchCatalogServices,
} from '../services/customerApi';
import { ServiceCard } from '../components/ServiceCard';
import { ServiceRequestModal } from '../components/ServiceRequestModal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  Search,
  Wrench,
  SlidersHorizontal,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface ServiceDiscoveryPageProps {
  initialSearchQuery?: string;
  onBackToHome?: () => void;
  onNavigateToDashboard?: () => void;
}

export const ServiceDiscoveryPage: React.FC<ServiceDiscoveryPageProps> = ({
  initialSearchQuery = '',
  onBackToHome,
  onNavigateToDashboard,
}) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high'>('recommended');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Request Modal state
  const [selectedServiceForModal, setSelectedServiceForModal] = useState<CatalogService | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load Categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load Services when filters change
  useEffect(() => {
    loadServices();
  }, [selectedCategory, searchQuery, sortBy]);

  const loadCategories = async () => {
    const cats = await fetchServiceCategories();
    setCategories(cats);
  };

  const loadServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filter: ServiceDiscoveryFilter = {
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        searchQuery: searchQuery ? searchQuery : undefined,
        sortBy: sortBy,
      };
      const data = await fetchCatalogServices(filter);
      setServices(data);
    } catch (err: any) {
      setError('حدث خطأ أثناء تحميل الخدمات.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRequestModal = (service: CatalogService) => {
    setSelectedServiceForModal(service);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-6 pt-2">
      {/* Header & Search */}
      <section className="sticky top-0 z-10 bg-slate-50 pb-2">
        <div className="flex items-center gap-3 mb-6">
          {onBackToHome && (
             <button onClick={onBackToHome} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-transform cursor-pointer">
               <ChevronRight className="w-5 h-5" />
             </button>
          )}
          <div>
            <h2 className="text-xl font-black text-slate-900">دليل الخدمات</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">صنايعية وفنيين كفر البطيخ ودمياط بين إيديك</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="ابحث عن كهربائي، سباك..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsFilterSheetOpen(true)}
            className="w-12 h-[46px] bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </section>

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

      {/* Services List */}
      <section className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-4 flex gap-4 shadow-sm border border-slate-100">
              <Skeleton className="w-24 h-24 rounded-2xl shrink-0" />
              <div className="space-y-3 flex-1 py-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-1/3 mt-2" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="bg-rose-50 text-rose-700 p-6 rounded-3xl text-center space-y-4 border border-rose-100">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-sm">
               <RefreshCw className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-bold mb-1">حدثت مشكلة بسيطة</h4>
               <p className="text-xs opacity-80">حاول مرة تانية، أو اتأكد من اتصالك بالإنترنت.</p>
             </div>
             <button onClick={loadServices} className="bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md cursor-pointer">
               إعادة المحاولة
             </button>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 shadow-sm mt-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">مفيش خدمات هنا</h3>
            <p className="text-sm text-slate-500">جرب تغير كلمات البحث أو التصنيف.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service, i) => (
              <motion.div key={service.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ServiceCard service={service} onRequest={handleOpenRequestModal} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* FILTER BOTTOM SHEET */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center dir-rtl">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsFilterSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 z-10 shadow-2xl pb-safe flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-6">فرز وتصفية</h3>
              
              <div className="space-y-4 mb-8">
                <h4 className="font-bold text-sm text-slate-500">الترتيب حسب</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'recommended', label: 'الأكثر صلة والأعلى تقييماً' },
                    { id: 'price_low', label: 'السعر: من الأقل للأعلى' },
                    { id: 'price_high', label: 'السعر: من الأعلى للأقل' }
                  ].map(opt => (
                    <button 
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as any)}
                      className={`p-4 rounded-2xl border text-right font-bold text-sm transition-colors cursor-pointer ${
                        sortBy === opt.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700 bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-full py-4 bg-slate-900 text-white font-bold text-base rounded-2xl active:scale-95 transition-transform cursor-pointer"
              >
                تطبيق الفرز
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ServiceRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={selectedServiceForModal}
        onSuccess={() => onNavigateToDashboard?.()}
      />
    </div>
  );
};
