import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../../context/AuthContext';
import { 
  Search, Mic, MapPin, ChevronLeft, 
  Car, Wrench, Store, Briefcase, Stethoscope, Building2, GraduationCap, MoonStar,
  Star, Clock, ChevronRight, Activity, Navigation, ArrowLeft
} from 'lucide-react';

interface CustomerHomePageProps {
  onNavigateZone: (zone: string, searchQuery?: string) => void;
}

export const CustomerHomePage: React.FC<CustomerHomePageProps> = ({ onNavigateZone }) => {
  const { user, isAuthenticated } = useAuth();
  
  const quickCategories = [
    { id: 'go', label: 'كفراوي Go', icon: <Car className="w-7 h-7" />, color: 'bg-emerald-100 text-emerald-700', zone: 'driver' },
    { id: 'services', label: 'خدمات', icon: <Wrench className="w-7 h-7" />, color: 'bg-blue-100 text-blue-700', zone: 'services_discovery' },
    { id: 'market', label: 'السوق', icon: <Store className="w-7 h-7" />, color: 'bg-purple-100 text-purple-700', zone: 'marketplace' },
    { id: 'jobs', label: 'وظائف', icon: <Briefcase className="w-7 h-7" />, color: 'bg-amber-100 text-amber-700', zone: 'employer' },
    { id: 'doctors', label: 'أطباء', icon: <Stethoscope className="w-7 h-7" />, color: 'bg-rose-100 text-rose-700', zone: 'services_discovery' },
    { id: 'shops', label: 'محلات', icon: <Building2 className="w-7 h-7" />, color: 'bg-indigo-100 text-indigo-700', zone: 'marketplace' },
    { id: 'education', label: 'تعليم', icon: <GraduationCap className="w-7 h-7" />, color: 'bg-cyan-100 text-cyan-700', zone: 'services_discovery' },
    { id: 'islamic', label: 'إسلاميات', icon: <MoonStar className="w-7 h-7" />, color: 'bg-teal-100 text-teal-700', zone: 'services_discovery' },
  ];

  const popularServices = [
    { id: 1, name: 'تأسيس وصيانة السباكة', price: '١٥٠ ج.م', rating: 4.8, img: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=200' },
    { id: 2, name: 'صيانة التكييف المركزي', price: '٢٥٠ ج.م', rating: 4.9, img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=200' },
    { id: 3, name: 'أعمال الكهرباء المنزلية', price: '١٢٠ ج.م', rating: 4.7, img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=200' },
  ];

  const marketProducts = [
    { id: 1, name: 'وجبة شاورما عربي', store: 'مطعم السوري', price: '٩٥ ج.م', rating: 4.9, img: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=200' },
    { id: 2, name: 'كيلو لحم بلدي', store: 'جزارة التوحيد', price: '٤٥٠ ج.م', rating: 4.8, img: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?auto=format&fit=crop&q=80&w=200' },
    { id: 3, name: 'خضار مشكل طازج', store: 'سوق الخضار', price: '٤٥ ج.م', rating: 4.5, img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200' },
  ];

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. HERO SECTION */}
      <section className="pt-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h2 className="text-2xl font-black text-slate-900 mb-1">
            أهلاً بك في كفراوي 👋
          </h2>
          <p className="text-sm font-medium text-slate-500">كل اللي محتاجه في كفر الشيخ في مكان واحد.</p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative mb-8 shadow-sm">
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input 
            type="text" 
            placeholder="بتدور على إيه؟" 
            className="w-full bg-white border border-slate-100 rounded-3xl py-4 pr-12 pl-12 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          />
          <button className="absolute inset-y-2 left-2 w-10 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-colors cursor-pointer">
            <Mic className="w-4 h-4" />
          </button>
        </motion.div>
      </section>

      {/* 2. QUICK SERVICES (GRID) */}
      <section>
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {quickCategories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (i * 0.05) }}
              onClick={() => onNavigateZone(cat.zone)}
              className="flex flex-col items-center gap-2 group cursor-pointer active:scale-90 transition-transform"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${cat.color} group-hover:shadow-md transition-all`}>
                {cat.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-700">{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* 3. KAFRAWY GO HERO CARD */}
      <section>
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-slate-900 rounded-[24px] p-5 shadow-xl relative overflow-hidden text-white"
        >
          {/* Background Map Graphic (Subtle) */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.4) 0%, transparent 20%)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <Car className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black tracking-tight">رايح فين؟</h3>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <div className="flex-1 text-sm font-bold text-white border-b border-white/10 pb-2">موقعك الحالي (كفر الشيخ)</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                <div className="flex-1 text-sm font-bold text-white/50 cursor-pointer" onClick={() => onNavigateZone('driver')}>حدد وجهتك...</div>
              </div>
            </div>

            <button 
              onClick={() => onNavigateZone('driver')}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              اطلب كابتن دلوقتي
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* 4. NEARBY SERVICES */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-base font-black text-slate-900">خدمات قريبة منك</h3>
          <button onClick={() => onNavigateZone('services_discovery')} className="text-xs font-bold text-emerald-600 flex items-center gap-1 cursor-pointer">
            عرض الكل <ChevronLeft className="w-3 h-3" />
          </button>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x custom-scrollbar-hide">
          {popularServices.map((srv, i) => (
            <motion.div 
              key={srv.id} 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (i * 0.1) }}
              className="min-w-[200px] w-[200px] bg-white rounded-3xl p-3 shadow-sm border border-slate-100 snap-center cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => onNavigateZone('services_discovery')}
            >
              <div className="w-full h-28 rounded-2xl bg-slate-100 mb-3 overflow-hidden relative">
                <img src={srv.img} alt={srv.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-slate-900 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {srv.rating}
                </div>
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1 line-clamp-1">{srv.name}</h4>
              <p className="text-emerald-600 font-black text-sm mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{srv.price}</p>
              <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                اطلب الآن
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. NEARBY MARKETPLACE */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-base font-black text-slate-900">السوق قريب منك 🛍️</h3>
          <button onClick={() => onNavigateZone('marketplace')} className="text-xs font-bold text-emerald-600 flex items-center gap-1 cursor-pointer">
            تصفح السوق <ChevronLeft className="w-3 h-3" />
          </button>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 snap-x custom-scrollbar-hide">
          {marketProducts.map((prod, i) => (
            <motion.div 
              key={prod.id} 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + (i * 0.1) }}
              className="min-w-[160px] w-[160px] bg-white rounded-3xl p-3 shadow-sm border border-slate-100 snap-center cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => onNavigateZone('marketplace')}
            >
              <div className="w-full h-24 rounded-2xl bg-slate-100 mb-3 overflow-hidden relative">
                <img src={prod.img} alt={prod.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 mb-1">{prod.store}</p>
              <h4 className="font-bold text-xs text-slate-900 mb-2 line-clamp-1">{prod.name}</h4>
              <div className="flex items-center justify-between">
                <p className="text-slate-900 font-black text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{prod.price}</p>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="text-lg font-medium leading-none">+</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. NEARBY PLACES MAP CARD */}
      <section>
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-full h-32 bg-slate-200" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3, filter: 'grayscale(1)' }}></div>
           <div className="relative z-10 pt-16">
             <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                   <MapPin className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-black text-sm text-slate-900">أماكن وخدمات حولك</h3>
                   <p className="text-xs text-slate-500 font-medium">مفتوح الآن • 1.2 كم</p>
                 </div>
               </div>
               <button className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer">
                 <ChevronLeft className="w-5 h-5" />
               </button>
             </div>
           </div>
        </div>
      </section>

    </div>
  );
};
