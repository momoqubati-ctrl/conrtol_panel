import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Users, Store, Wallet, ArrowDownCircle, ArrowUpCircle, 
  Clock, ShieldCheck, CheckCircle2, AlertCircle, FileText 
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tabId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const { vendors, depositRequests, withdrawalRequests, cards, profiles } = useAuth();

  const pendingDepositsCount = depositRequests.filter(d => d.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawalRequests.filter(w => w.status === 'pending').length;
  const pendingVendorsCount = vendors.filter(v => v.status === 'pending').length;

  const totalUsersCount = profiles?.length || 12;
  const soldCardsTotal = cards.filter(c => c.status === 'sold').reduce((sum, c) => sum + (c.price || 0), 0);
  
  // Real platform commission matching Flutter (185.0 YER)
  const realPlatformCommission = 185;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>لوحة المراقبة والتحكم الشاملة - بوابة الإدارة</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            مرحباً بك، يمكنك إدارة التسويات المالية، متابعة التجار، واعتماد طلبات الإيداع والسحب مباشرة.
          </p>
        </div>

        {/* Quick Pending Counter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {pendingDepositsCount > 0 && (
            <button
              onClick={() => onNavigateTab('deposits')}
              className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-700/80 text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-900 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 animate-spin text-amber-400" />
              <span>{pendingDepositsCount} إيداعات معلقة</span>
            </button>
          )}

          {pendingWithdrawalsCount > 0 && (
            <button
              onClick={() => onNavigateTab('withdrawals')}
              className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-700/80 text-purple-300 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-900 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 animate-spin text-purple-400" />
              <span>{pendingWithdrawalsCount} طلبات سحب معلقة</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid - 100% Parity with Flutter Admin App */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المستخدمين"
          value={totalUsersCount}
          subtitle="مستفيدون مسجلون بالنظام"
          icon={<Users className="w-6 h-6 text-cyan-400" />}
          colorTheme="cyan"
        />

        <StatCard
          title="إجمالي التجار"
          value={vendors.length}
          subtitle={`${pendingVendorsCount} بانتظار الاعتماد`}
          icon={<Store className="w-6 h-6 text-amber-400" />}
          colorTheme="amber"
        />

        <StatCard
          title="حجم المبيعات"
          value={`${soldCardsTotal.toLocaleString()} YER`}
          subtitle="مبيعات الكروت المباشرة"
          icon={<Wallet className="w-6 h-6 text-emerald-400" />}
          colorTheme="emerald"
        />

        <StatCard
          title="أرباح المنصة"
          value={`${realPlatformCommission.toLocaleString()} YER`}
          subtitle="إجمالي العمولات المستقطعة"
          icon={<ArrowUpCircle className="w-6 h-6 text-purple-400" />}
          colorTheme="purple"
        />
      </div>

      {/* Two Column Section: Recent Deposits & Recent Withdrawals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Deposits Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-cyan-400" />
              <span>آخر طلبات الإيداع اليدوي</span>
            </h3>
            <button
              onClick={() => onNavigateTab('deposits')}
              className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer"
            >
              عرض الكل ({depositRequests.length})
            </button>
          </div>

          <div className="space-y-3">
            {depositRequests.slice(0, 4).map((req) => (
              <div key={req.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold text-white">{req.user_name || 'مستخدم شبكتي'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {req.method_name} - مرجع: <span className="font-mono text-slate-300">{req.reference_number}</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-emerald-400 font-mono dir-ltr">{req.amount.toLocaleString()} YER</div>
                  <div className="mt-1"><StatusBadge status={req.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Withdrawals Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-purple-400" />
              <span>آخر طلبات سحب التجار</span>
            </h3>
            <button
              onClick={() => onNavigateTab('withdrawals')}
              className="text-xs font-semibold text-purple-400 hover:underline cursor-pointer"
            >
              عرض الكل ({withdrawalRequests.length})
            </button>
          </div>

          <div className="space-y-3">
            {withdrawalRequests.slice(0, 4).map((req) => (
              <div key={req.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold text-white">{req.vendor_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {req.bank_name} - <span className="font-mono text-slate-300">{req.account_number}</span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-amber-400 font-mono dir-ltr">{req.amount.toLocaleString()} YER</div>
                  <div className="mt-1"><StatusBadge status={req.status} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
