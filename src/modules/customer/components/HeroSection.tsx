import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Search, Sparkles, MapPin, Car, Wrench, Store, Briefcase, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface HeroSectionProps {
  onSearch: (query: string) => void;
  onNavigateZone: (zone: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onSearch, onNavigateZone }) => {
  const { user, isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 sm:p-10 shadow-xl dir-rtl border border-emerald-700/50">
      {/* Subtle Background Pattern Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl space-y-6">
        {/* Welcome Tag & Location Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>منصة الخدمات الموحدة لأهالي كفر البطيخ ودمياط</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-200/90 font-semibold bg-slate-900/40 px-3 py-1 rounded-full border border-slate-700/50">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>كفر البطيخ، دمياط والمدن المجاورة</span>
          </div>
        </div>

        {/* Dynamic Welcome Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            {isAuthenticated && user ? (
              <span>أهلاً بك مجدداً، {user.full_name} 👋</span>
            ) : (
              <span>مرحباً بك في سوبر آب كفراوي 🚀</span>
            )}
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base font-normal leading-relaxed max-w-2xl">
            كل ما تحتاجه في كفر البطيخ ومحافظة دمياط في مكان واحد: توصيل سريع (Kafrawy Go)، صيانة وحرفيين، التسوق المحلي، والفرص الوظيفية.
          </p>
        </div>

        {/* Primary Universal Search Bar */}
        <form onSubmit={handleSearchSubmit} className="pt-2">
          <div className="relative flex items-center bg-white rounded-2xl p-2 shadow-2xl border border-emerald-100 max-w-2xl">
            <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن سباك، كهربائي، توصيل، منتج أو وظيفة..."
              className="w-full bg-transparent px-2 py-2 text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="shrink-0 px-5"
            >
              بحث سريع
            </Button>
          </div>
        </form>

        {/* Quick Service Shortcuts Pills */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-emerald-200/80 ml-1">تصفح سريع:</span>

          <button
            onClick={() => onNavigateZone('driver')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
          >
            <Car className="w-3.5 h-3.5 text-blue-400" />
            <span>Kafrawy Go</span>
          </button>

          <button
            onClick={() => onNavigateZone('services_discovery')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400" />
            <span>الحرفيين والخدمات</span>
          </button>

          <button
            onClick={() => onNavigateZone('merchant')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
          >
            <Store className="w-3.5 h-3.5 text-purple-400" />
            <span>السوق المحلي</span>
          </button>

          <button
            onClick={() => onNavigateZone('employer')}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
          >
            <Briefcase className="w-3.5 h-3.5 text-teal-400" />
            <span>الوظائف</span>
          </button>
        </div>
      </div>
    </div>
  );
};
