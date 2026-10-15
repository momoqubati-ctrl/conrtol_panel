import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, BarChart2, Ticket, CheckCircle2 } from 'lucide-react';
import { isCardSold, isCardAvailable } from '../../lib/cardStatusUtils';
import { calculateCommissionBreakdown, formatCommissionRate } from '../../lib/commissionUtils';

export const VendorAnalytics: React.FC = () => {
  const { currentVendor, cards, networks, categories } = useAuth();
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');

  const vendorId = currentVendor?.id || '';
  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorCards = vendorNetworks.length ? cards.filter(c => vendorNetworks.some(n => n.id === c.network_id)) : [];

  const soldCards = vendorCards.filter(isCardSold);
  const availableCards = vendorCards.filter(isCardAvailable);

  const grossSales = soldCards.reduce((sum, c) => sum + (c.price || 0), 0);
  const rawCommissionRate = currentVendor?.commission_rate ?? 5.0;
  const breakdown = calculateCommissionBreakdown(grossSales, rawCommissionRate);
  const netEarnings = breakdown.vendorNetAmount;
  const commissionPaid = breakdown.commissionAmount;
  const commissionRateFormatted = formatCommissionRate(breakdown.commissionRate);

  // Dynamic Sales breakdown grouped by category name
  const salesByCatMap: Record<string, { count: number; total: number }> = {};
  soldCards.forEach(c => {
    const catName = c.category_name || 'باقة غير محددة';
    if (!salesByCatMap[catName]) {
      salesByCatMap[catName] = { count: 0, total: 0 };
    }
    salesByCatMap[catName].count += 1;
    salesByCatMap[catName].total += (c.price || 0);
  });

  // Fallback items if no sold cards yet
  const salesByCat = Object.keys(salesByCatMap).length > 0 
    ? Object.entries(salesByCatMap).map(([name, data]) => ({ name, ...data }))
    : [];

  const totalCalculated = salesByCat.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>التحليلات المالية واتجاهات المبيعات (Sales Analytics)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">متابعة أداء المبيعات، نمو الأرباح الصافية، والعمولات المخصومة</p>
        </div>

        <select
          value={period}
          onChange={e => setPeriod(e.target.value as any)}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">كل الأوقات</option>
          <option value="month">الشهر الحالي</option>
          <option value="week">الأسبوع الحالي</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 block mb-1">إجمالي المبيعات الكلية</span>
          <span className="text-2xl font-extrabold text-white font-mono dir-ltr">{grossSales.toLocaleString()} YER</span>
          <span className="text-[11px] text-cyan-400 block mt-1">{soldCards.length} كرت مباع</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 block mb-1">صافي أرباح التاجر</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono dir-ltr">{netEarnings.toLocaleString()} YER</span>
          <span className="text-[11px] text-slate-400 block mt-1">جاهزة للسحب</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 block mb-1">عمولة المنصة ({commissionRateFormatted})</span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono dir-ltr">{commissionPaid.toLocaleString()} YER</span>
          <span className="text-[11px] text-slate-400 block mt-1">مخصومة تلقائياً</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 block mb-1">المخزون المتاح للبيع</span>
          <span className="text-2xl font-extrabold text-purple-400 font-mono dir-ltr">{availableCards.length} كرت</span>
          <span className="text-[11px] text-purple-300 block mt-1">تجاه العروض النشطة</span>
        </div>
      </div>

      {/* Visual Chart / Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span>توزيع المبيعات بحسب فئات الكروت من قاعدة البيانات</span>
        </h3>

        <div className="space-y-4">
          {salesByCat.map((item, idx) => {
            const percentage = Math.round((item.total / totalCalculated) * 100);
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.name}</span>
                    <span className="text-slate-500 font-normal">({item.count} كرت)</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{item.total.toLocaleString()} YER ({percentage}%)</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${Math.max(percentage, 4)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
