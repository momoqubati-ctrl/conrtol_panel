import React, { useState } from 'react';
import { Header } from '../common/Header';
import { Sidebar, SidebarTab } from '../common/Sidebar';
import { VendorDashboard } from './VendorDashboard';
import { VendorNetworks } from './VendorNetworks';
import { VendorCategories } from './VendorCategories';
import { VendorCardsUpload } from './VendorCardsUpload';
import { VendorCardsStock } from './VendorCardsStock';
import { VendorAnalytics } from './VendorAnalytics';
import { VendorAccountStatement } from './VendorAccountStatement';
import { VendorActivityReport } from './VendorActivityReport';
import { VendorWithdrawals } from './VendorWithdrawals';
import { VendorLines } from './VendorLines';
import { VendorNotifications } from './VendorNotifications';
import { VendorOperationsReport } from './reports/VendorOperationsReport';
import { VendorMovementsReport } from './reports/VendorMovementsReport';
import { 
  LayoutDashboard, Wifi, Ticket, Upload, 
  TrendingUp, FileSpreadsheet, Wallet, Phone, Bell, Activity, FileText 
} from 'lucide-react';

export const VendorLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const vendorTabs: SidebarTab[] = [
    { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
    { 
      id: 'reports', 
      label: 'التقارير المالية والعمليات', 
      icon: <FileText className="w-5 h-5 text-amber-400" />,
      subItems: [
        { id: 'vendor_reports_operations', label: 'تقرير العمليات (شراء وبيع الكروت)', icon: <Ticket className="w-4 h-4 text-amber-400" /> },
        { id: 'vendor_reports_movements', label: 'تقرير عمليات السحب والإيداع', icon: <Wallet className="w-4 h-4 text-emerald-400" /> },
      ]
    },
    { id: 'networks', label: 'إدارة الشبكات وGPS', icon: <Wifi className="w-5 h-5" /> },
    { id: 'lines', label: 'خطوط الإنترنت المباشرة', icon: <Phone className="w-5 h-5" /> },
    { id: 'categories', label: 'إدارة فئات الكروت', icon: <Ticket className="w-5 h-5" /> },
    { id: 'upload', label: 'رفع الكروت والكشوفات', icon: <Upload className="w-5 h-5" /> },
    { id: 'stock', label: 'مخزون الأكواد', icon: <Ticket className="w-5 h-5" /> },
    { id: 'analytics', label: 'التحليلات والمبيعات', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'statement', label: 'كشف الحساب المالي الرسمي', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'activity', label: 'تقرير الحركات والأحداث', icon: <Activity className="w-5 h-5" /> },
    { id: 'withdrawals', label: 'طلب سحب الأرباح', icon: <Wallet className="w-5 h-5" /> },
    { id: 'notifications', label: 'الإشعارات والتنبيهات', icon: <Bell className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col dir-rtl">
      <Header portalTitle="بوابة التاجر وأصحاب الشبكات (Vendor Portal)" portalType="vendor" />

      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          tabs={vendorTabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          portalType="vendor"
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl">
          {activeTab === 'dashboard' && <VendorDashboard onNavigateTab={setActiveTab} />}
          
          {/* Main Vendor Reports Views */}
          {(activeTab === 'reports' || activeTab === 'vendor_reports_operations') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setActiveTab('vendor_reports_operations')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-amber-600 text-white shadow-md flex items-center gap-1.5"
                >
                  <Ticket className="w-4 h-4" />
                  <span>تقرير العمليات (شراء وبيع الكروت)</span>
                </button>
                <button
                  onClick={() => setActiveTab('vendor_reports_movements')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <Wallet className="w-4 h-4" />
                  <span>تقرير عمليات السحب والإيداع</span>
                </button>
              </div>
              <VendorOperationsReport />
            </div>
          )}

          {activeTab === 'vendor_reports_movements' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setActiveTab('vendor_reports_operations')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-slate-900 text-slate-400 hover:text-white border border-slate-800 flex items-center gap-1.5"
                >
                  <Ticket className="w-4 h-4" />
                  <span>تقرير العمليات (شراء وبيع الكروت)</span>
                </button>
                <button
                  onClick={() => setActiveTab('vendor_reports_movements')}
                  className="px-4 py-2 rounded-xl transition-all cursor-pointer bg-amber-600 text-white shadow-md flex items-center gap-1.5"
                >
                  <Wallet className="w-4 h-4" />
                  <span>تقرير عمليات السحب والإيداع</span>
                </button>
              </div>
              <VendorMovementsReport />
            </div>
          )}

          {activeTab === 'networks' && <VendorNetworks />}
          {activeTab === 'lines' && <VendorLines />}
          {activeTab === 'categories' && <VendorCategories />}
          {activeTab === 'upload' && <VendorCardsUpload />}
          {activeTab === 'stock' && <VendorCardsStock />}
          {activeTab === 'analytics' && <VendorAnalytics />}
          {activeTab === 'statement' && <VendorAccountStatement />}
          {activeTab === 'activity' && <VendorActivityReport />}
          {activeTab === 'withdrawals' && <VendorWithdrawals />}
          {activeTab === 'notifications' && <VendorNotifications />}
        </main>
      </div>
    </div>
  );
};
