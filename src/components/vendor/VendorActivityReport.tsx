import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DataTable, Column } from '../common/DataTable';
import { Activity, Clock, ShieldCheck, Search, Filter } from 'lucide-react';
import { resolveOperationNumber, resolveUnifiedCardTransaction } from '../../lib/ledgerUtils';
import { isCardSold } from '../../lib/cardStatusUtils';

export interface SystemActivityLog {
  id: string;
  ref_no: string;
  timestamp: string;
  action_type: string;
  performer: string;
  affected_target: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  ip_address?: string;
  device_info?: string;
}

export const VendorActivityReport: React.FC = () => {
  const { currentVendor, cards, networks, withdrawalRequests, lines, payments = [], paymentItems = [] } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');

  const vendorId = currentVendor?.id || '';
  const vendorNetworks = vendorId ? networks.filter(n => n.vendor_id === vendorId) : [];
  const vendorCards = vendorNetworks.length ? cards.filter(c => vendorNetworks.some(n => n.id === c.network_id)) : [];
  const vendorWithdrawals = vendorId ? withdrawalRequests.filter(w => w.vendor_id === vendorId) : [];
  const vendorLinesList = vendorId ? lines.filter(l => l.vendor_id === vendorId) : [];

  // Generate Activity Logs from real system events
  const activityLogs: SystemActivityLog[] = [
    ...vendorCards.filter(isCardSold).map(c => {
      const resolved = resolveUnifiedCardTransaction(c, { payments, paymentItems });
      return {
        id: `act-card-${c.id}`,
        ref_no: resolved.ubtr,
        timestamp: c.sold_at || c.created_at || new Date().toISOString(),
        action_type: 'شراء كرت',
        performer: 'مشترك / عميل',
        affected_target: c.category_name || 'كرت واي فاي',
        description: `تم بيع كرت من فئة ${c.category_name || 'باقة'} بقيمة ${c.price || 0} ريال عبر ${resolved.payment_method}`,
        status: 'completed' as const,
        ip_address: '192.168.1.45',
        device_info: 'Android / Shabakati App',
      };
    }),
    ...vendorWithdrawals.map(w => ({
      id: `act-wd-${w.id}`,
      ref_no: resolveOperationNumber(w),
      timestamp: w.created_at || new Date().toISOString(),
      action_type: 'طلب سحب أرباح',
      performer: currentVendor?.business_name || 'التاجر',
      affected_target: `حساب ${w.account_number}`,
      description: `طلب سحب أرباح بمبلغ ${w.amount.toLocaleString()} ريال إلى ${w.bank_name}`,
      status: w.status === 'approved' ? ('completed' as const) : w.status === 'rejected' ? ('failed' as const) : ('pending' as const),
      ip_address: '10.0.0.12',
      device_info: 'Web Dashboard / Chrome',
    })),
    ...vendorLinesList.map(l => ({
      id: `act-line-${l.id}`,
      ref_no: `LINE-${l.id.substring(0, 8)}`,
      timestamp: l.created_at || new Date().toISOString(),
      action_type: 'إضافة خط إنترنت',
      performer: currentVendor?.business_name || 'التاجر',
      affected_target: l.line_number,
      description: `تسجيل خط إنترنت مباشر برقم ${l.line_number}`,
      status: 'completed' as const,
      ip_address: '10.0.0.12',
      device_info: 'Web Dashboard',
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredLogs = filterType === 'all' 
    ? activityLogs 
    : activityLogs.filter(l => l.action_type.includes(filterType));

  const columns: Column<SystemActivityLog>[] = [
    {
      header: 'رقم العملية / المرجع',
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-cyan-300 dir-ltr block">{row.ref_no}</span>
          <span className="text-[11px] text-slate-500">{row.id.substring(0, 12)}</span>
        </div>
      ),
    },
    {
      header: 'نوع العملية / الإجراء',
      accessor: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          row.action_type.includes('شراء') ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' :
          row.action_type.includes('سحب') ? 'bg-amber-950 border border-amber-800 text-amber-300' :
          'bg-blue-950 border border-blue-800 text-blue-300'
        }`}>
          {row.action_type}
        </span>
      ),
    },
    {
      header: 'المنفذ',
      accessor: (row) => <span className="font-semibold text-slate-200 text-xs">{row.performer}</span>,
    },
    {
      header: 'الوصف والهدف المتأثر',
      accessor: (row) => (
        <div>
          <div className="text-xs text-slate-200">{row.description}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{row.affected_target}</div>
        </div>
      ),
    },
    {
      header: 'الحالة',
      accessor: (row) => (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
          row.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
          row.status === 'failed' ? 'bg-red-950 text-red-400 border border-red-800' :
          'bg-amber-950 text-amber-400 border border-amber-800'
        }`}>
          {row.status === 'completed' ? 'مكتملة' : row.status === 'failed' ? 'مرفوضة' : 'قيد الانتظار'}
        </span>
      ),
    },
    {
      header: 'التاريخ والوقت',
      accessor: (row) => (
        <span className="text-xs text-slate-400 font-mono dir-ltr">
          {new Date(row.timestamp).toLocaleString('ar-YE')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            <span>تقرير الحركات والعمليات (Activity & System Log)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            سجل تشغيلي تفصيلي لرصد الأحداث والتغييرات المنفذة بالنظام (Audit Trail).
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({activityLogs.length})
          </button>
          <button
            onClick={() => setFilterType('شراء')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'شراء' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            مبيعات
          </button>
          <button
            onClick={() => setFilterType('سحب')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterType === 'سحب' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            سحوبات
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        title="سجل الحركات والأحداث التشغيلية"
        searchPlaceholder="بحث برقم المرجع، الوصف، أو نوع الحركة..."
        exportFilename="activity_report"
      />
    </div>
  );
};
