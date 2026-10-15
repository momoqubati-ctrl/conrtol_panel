import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../common/Header';
import { Sidebar, SidebarTab } from '../common/Sidebar';
import { AdminDashboard } from './AdminDashboard';
import { AdminDeposits } from './AdminDeposits';
import { AdminWithdrawals } from './AdminWithdrawals';
import { AdminWalletsConfig } from './AdminWalletsConfig';
import { AdminVendors } from './AdminVendors';
import { AdminRetailers } from './AdminRetailers';
import { AdminBroadcast } from './AdminBroadcast';
import { AdminSmsLogs } from './AdminSmsLogs';
import { AdminUsers } from './AdminUsers';
import { AdminCommission } from './AdminCommission';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminSettings } from './AdminSettings';
import { AdminMonitoring } from './AdminMonitoring';
import { AdminPaymentsManagement } from './AdminPaymentsManagement';
import { AdminOperationsReport } from './reports/AdminOperationsReport';
import { AdminMovementsReport } from './reports/AdminMovementsReport';
import { AdminPendingReport } from './reports/AdminPendingReport';
import { 
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, CreditCard,
  Settings, Store, Radio, MessageSquare, Users, Percent, ShieldCheck, Activity,
  BarChart3, Clock, ArrowRightLeft 
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { depositRequests = [], withdrawalRequests = [], vendors = [], payments = [] } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const pendingDeposits = (depositRequests || []).filter(d => d && d.status === 'pending').length;
  const pendingWithdrawals = (withdrawalRequests || []).filter(w => w && w.status === 'pending').length;
  const pendingVendors = (vendors || []).filter(v => v && v.status === 'pending').length;
  const pendingOperationsCount = (payments || []).filter(p => p && (p.status === 'pending' || p.status === 'reconciliation_required')).length;

  const adminTabs: SidebarTab[] = [
    { id: 'dashboard', label: 'لوحة التحكم والمراقبة', icon: <LayoutDashboard className="w-5 h-5" /> },
    { 
      id: 'reports', 
      label: 'التقارير والعمليات المالية', 
      icon: <BarChart3 className="w-5 h-5 text-blue-400" />,
      subItems: [
        { id: 'admin_reports_operations', label: 'تقرير كافة عمليات بيع وشراء الكروت', icon: <CreditCard className="w-4 h-4 text-blue-400" /> },
        { id: 'admin_reports_movements', label: 'تقرير عمليات السحب والإيداع', icon: <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> },
        { id: 'admin_reports_pending', label: 'تقرير العمليات المعلقة', icon: <Clock className="w-4 h-4 text-amber-400" />, badge: pendingOperationsCount },
      ]
    },
    { id: 'payments', label: 'مركز العمليات والمطابقة', icon: <CreditCard className="w-5 h-5 text-cyan-400" /> },
    { id: 'deposits', label: 'طلبات الإيداع اليدوي', icon: <ArrowDownCircle className="w-5 h-5" />, badge: pendingDeposits },
    { id: 'withdrawals', label: 'سحب أرباح التجار', icon: <ArrowUpCircle className="w-5 h-5" />, badge: pendingWithdrawals },
    { id: 'vendors', label: 'إدارة أصحاب الشبكات', icon: <Store className="w-5 h-5" />, badge: pendingVendors },
    { id: 'retailers', label: 'تجار التجزئة والبقالات', icon: <Store className="w-5 h-5 text-emerald-400" /> },
    { id: 'users', label: 'إدارة الحسابات والمستخدمين', icon: <Users className="w-5 h-5" /> },
    { id: 'commission', label: 'قواعد العمولات', icon: <Percent className="w-5 h-5" /> },
    { id: 'wallets', label: 'تهيئة بوابات الدفع', icon: <Settings className="w-5 h-5" /> },
    { id: 'audit', label: 'سجل العمليات والتدقيق', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'broadcast', label: 'البث والمحيط الجماعي', icon: <Radio className="w-5 h-5" /> },
    { id: 'sms', label: 'سجلات الـ SMS', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'monitoring', label: 'مراقبة صحة النظام', icon: <Activity className="w-5 h-5" /> },
    { id: 'settings', label: 'إعدادات المنصة العامة', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col dir-rtl">
      <Header portalTitle="بوابة الإدارة العليا (Admin Portal)" portalType="admin" />

      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          tabs={adminTabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          portalType="admin"
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl">
          {activeTab === 'dashboard' && <AdminDashboard onNavigateTab={setActiveTab} />}

          {/* Main Admin Reports Navigation & Views */}
          {(activeTab === 'reports' || activeTab === 'admin_reports_operations') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setActiveTab('admin_reports_operations')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-blue-600 text-white shadow-md flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>تقرير كافة عمليات بيع وشراء الكروت</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_reports_movements')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تقرير عمليات السحب والإيداع</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_reports_pending')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>تقرير العمليات المعلقة</span>
                  {pendingOperationsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white">
                      {pendingOperationsCount}
                    </span>
                  )}
                </button>
              </div>
              <AdminOperationsReport />
            </div>
          )}

          {activeTab === 'admin_reports_movements' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setActiveTab('admin_reports_operations')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>تقرير كافة عمليات بيع وشراء الكروت</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_reports_movements')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-blue-600 text-white shadow-md flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تقرير عمليات السحب والإيداع</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_reports_pending')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>تقرير العمليات المعلقة</span>
                  {pendingOperationsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white">
                      {pendingOperationsCount}
                    </span>
                  )}
                </button>
              </div>
              <AdminMovementsReport />
            </div>
          )}

          {activeTab === 'admin_reports_pending' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setActiveTab('admin_reports_operations')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>تقرير كافة عمليات بيع وشراء الكروت</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_reports_movements')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تقرير عمليات السحب والإيداع</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin_reports_pending')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-blue-600 text-white shadow-md flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>تقرير العمليات المعلقة</span>
                  {pendingOperationsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white">
                      {pendingOperationsCount}
                    </span>
                  )}
                </button>
              </div>
              <AdminPendingReport />
            </div>
          )}

          {activeTab === 'payments' && <AdminPaymentsManagement />}
          {activeTab === 'deposits' && <AdminDeposits />}
          {activeTab === 'withdrawals' && <AdminWithdrawals />}
          {activeTab === 'vendors' && <AdminVendors />}
          {activeTab === 'retailers' && <AdminRetailers />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'commission' && <AdminCommission />}
          {activeTab === 'wallets' && <AdminWalletsConfig />}
          {activeTab === 'audit' && <AdminAuditLogs />}
          {activeTab === 'broadcast' && <AdminBroadcast />}
          {activeTab === 'sms' && <AdminSmsLogs />}
          {activeTab === 'monitoring' && <AdminMonitoring />}
          {activeTab === 'settings' && <AdminSettings />}
        </main>
      </div>
    </div>
  );
};
