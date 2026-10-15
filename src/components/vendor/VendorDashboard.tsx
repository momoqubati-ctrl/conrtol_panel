import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Wallet, Eye, EyeOff, PlusCircle, ShoppingBag, 
  Calendar, CreditCard, Package, TrendingUp, ChevronLeft, ArrowUpRight
} from 'lucide-react';
import { isCardSold, isCardAvailable } from '../../lib/cardStatusUtils';

interface VendorDashboardProps {
  onNavigateTab: (tabId: string) => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({ onNavigateTab }) => {
  const { currentVendor, wallets, networks, categories, cards, withdrawalRequests } = useAuth();
  const [obscureBalance, setObscureBalance] = useState(false);

  const vendorId = currentVendor?.id || '';
  const vendorWallet = wallets.find(w => w.user_id === vendorId || w.id === vendorId);
  const rawBalance = vendorWallet?.balance || 0;
  const heldBalance = vendorWallet?.held_balance || 0;
  const walletBalance = Math.max(0, rawBalance - heldBalance);

  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorCards = vendorNetworks.length ? cards.filter(c => vendorNetworks.some(n => n.id === c.network_id)) : [];

  const soldCards = vendorCards.filter(isCardSold);
  const availableCards = vendorCards.filter(isCardAvailable);

  const grossSales = soldCards.reduce((sum, c) => sum + (c.price || 0), 0);
  const commissionRate = currentVendor?.commission_rate || 5.0;

  // Yemen Timezone UTC+3 calculations matching Flutter vendor_dashboard_page.dart
  const now = new Date();
  const yemenOffsetMs = 3 * 3600 * 1000;
  const yemenNow = new Date(now.getTime() + yemenOffsetMs);
  const yemenStartOfToday = new Date(Date.UTC(yemenNow.getUTCFullYear(), yemenNow.getUTCMonth(), yemenNow.getUTCDate()) - yemenOffsetMs);

  let todaySales = 0;
  let todayOpsCount = 0;
  const dailyPerformance = [0, 0, 0, 0, 0, 0, 0]; // الأحد, الاثنين, الثلاثاء, الأربعاء, الخميس, الجمعة, السبت

  soldCards.forEach(card => {
    const cardPrice = card.price || 0;
    if (card.sold_at) {
      const soldDate = new Date(card.sold_at);
      if (!isNaN(soldDate.getTime())) {
        if (soldDate >= yemenStartOfToday) {
          todaySales += cardPrice;
          todayOpsCount += 1;
        }

        const diffDays = Math.floor((now.getTime() - soldDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 7) {
          const dayIdx = Math.floor(soldDate.getDay()) % 7;
          dailyPerformance[dayIdx] += cardPrice;
        }
      }
    }
  });

  const maxDaily = Math.max(1, ...dailyPerformance);
  const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="space-y-6">
      {/* Primary Blue Balance Card (Exact Flutter Parity) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-2xl relative overflow-hidden">
        {/* Background Overlay Effect */}
        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm text-blue-100 font-medium">الرصيد القابل للسحب</span>
              <button
                onClick={() => setObscureBalance(!obscureBalance)}
                className="p-1 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors cursor-pointer"
                title="إخفاء / إظهار الرصيد"
              >
                {obscureBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight flex items-baseline gap-2">
              <span>{obscureBalance ? '••••••••' : walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="text-sm font-bold text-blue-200">ريال</span>
            </div>
          </div>

          {/* Quick Action Button matching Flutter App */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigateTab('withdrawals')}
              className="w-full md:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-blue-50 text-blue-800 font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-blue-700" />
              <span>طلب سحب</span>
            </button>

            <button
              onClick={() => onNavigateTab('upload')}
              className="w-full md:w-auto px-5 py-3 rounded-2xl bg-blue-500/30 hover:bg-blue-500/40 text-white font-bold text-sm border border-white/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>رفع كروت</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2x2 Overview Cards Grid (نظرة عامة - Matching Flutter App) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 px-1">نظرة عامة</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Sales */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-medium">مبيعات اليوم</div>
              <div className="text-lg font-extrabold text-cyan-400 font-mono">{todaySales.toLocaleString()} ريال</div>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Operations Count (Today) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-medium">عدد العمليات (اليومية)</div>
              <div className="text-lg font-extrabold text-slate-100 font-mono">{todayOpsCount}</div>
            </div>
            <div className="p-3 rounded-2xl bg-purple-950/80 border border-purple-800/60 text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Sold Cards */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-medium">كروت مباعة</div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono">{soldCards.length} كرت</div>
              <button onClick={() => onNavigateTab('stock')} className="text-[11px] text-emerald-400 hover:underline cursor-pointer block pt-0.5">التفاصيل</button>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Remaining Cards */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-slate-400 font-medium">كروت متبقية</div>
              <div className="text-lg font-extrabold text-amber-400 font-mono">{availableCards.length} كرت</div>
              <button onClick={() => onNavigateTab('stock')} className="text-[11px] text-amber-400 hover:underline cursor-pointer block pt-0.5">التفاصيل</button>
            </div>
            <div className="p-3 rounded-2xl bg-amber-950/80 border border-amber-800/60 text-amber-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Performance Line/Bar Chart (أداء المبيعات الحقيقي - آخر 7 أيام) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <span>أداء المبيعات الحقيقي (آخر 7 أيام)</span>
          </h3>
        </div>

        {/* 7-Day Interactive Sales Chart */}
        <div className="h-44 w-full flex flex-col justify-end pt-4">
          <div className="flex-1 flex items-end justify-between px-2 gap-2 border-b border-slate-800 pb-2">
            {weekDays.map((day, idx) => {
              const val = dailyPerformance[idx] || 0;
              const heightPercent = Math.max(10, Math.round((val / maxDaily) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold opacity-80 group-hover:opacity-100">
                    {val > 0 ? `${val.toLocaleString()}` : ''}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-3 sm:w-4 rounded-t-full bg-gradient-to-t from-blue-600 to-cyan-400 group-hover:from-blue-500 group-hover:to-cyan-300 transition-all duration-300"
                  />
                  <span className="text-[11px] text-slate-400 font-medium">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Navigation Links matching Flutter */}
      <div className="flex items-center justify-between pt-2 text-xs font-bold">
        <button
          onClick={() => onNavigateTab('statement')}
          className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>كشف الحساب الكامل</span>
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onNavigateTab('networks')}
          className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>إدارة الشبكات ونقاط التغطية</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
