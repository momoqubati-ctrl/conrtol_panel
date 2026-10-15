import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { Modal } from '../../common/Modal';
import { 
  ArrowDownCircle, ArrowUpCircle, FileSpreadsheet, Printer, 
  Search, Calendar, Filter, Wallet, Eye, CheckCircle2, XCircle 
} from 'lucide-react';
import { exportToCsv, exportToPrint } from '../../../lib/exportUtils';
import { resolveOperationNumber } from '../../../lib/ledgerUtils';

export interface AdminMovementItem {
  id: string;
  operation_number: string;
  type: 'deposit' | 'withdrawal';
  type_label: string;
  party_name: string;
  party_phone: string;
  party_role: string;
  channel: string;
  account_info: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
  admin_notes?: string;
  receipt_url?: string;
}

export const AdminMovementsReport: React.FC = () => {
  const { depositRequests = [], withdrawalRequests = [], vendors = [], profiles = [] } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItem, setSelectedItem] = useState<AdminMovementItem | null>(null);

  // Combine Deposits & Withdrawals
  const movementsData: AdminMovementItem[] = useMemo(() => {
    const items: AdminMovementItem[] = [];

    // 1. Deposits (Customer Wallet Top-ups)
    depositRequests.forEach((d: any) => {
      const user = profiles.find(p => p.id === d.user_id);
      const gross = Number(d.amount || 0);
      const fee = 0; // Deposit fee is typically 0
      const opNum = resolveOperationNumber(d);

      items.push({
        id: d.id,
        operation_number: opNum,
        type: 'deposit',
        type_label: 'إيداع رصيد محفظة',
        party_name: user?.name || d.user_name || 'عميل شبكتي',
        party_phone: user?.phone || (user as any)?.phone_number || d.user_phone || '770000000',
        party_role: 'عميل',
        channel: d.method_name || 'بوابة BasGate / تحويل بنكي',
        account_info: d.reference_number || 'مرجع إيداع',
        gross_amount: gross,
        fee_amount: fee,
        net_amount: gross - fee,
        created_at: d.created_at || new Date().toISOString(),
        status: (d.status === 'approved' ? 'completed' : d.status === 'rejected' ? 'failed' : 'pending') as 'completed' | 'pending' | 'failed',
        admin_notes: d.admin_notes || d.admin_statement,
        receipt_url: d.receipt_image_url,
      });
    });

    // 2. Withdrawals (Vendor Payouts)
    withdrawalRequests.forEach((w: any) => {
      const vendor = vendors.find(v => v.id === w.vendor_id);
      const prof = profiles.find(p => p.id === w.vendor_id);
      const gross = Number(w.amount || 0);
      const fee = 0; // Settlement fee
      const opNum = resolveOperationNumber(w);

      items.push({
        id: w.id,
        operation_number: opNum,
        type: 'withdrawal',
        type_label: 'سحب أرباح تاجر',
        party_name: vendor?.business_name || prof?.name || w.vendor_name || 'تاجر شبكة',
        party_phone: prof?.phone || (prof as any)?.phone_number || w.vendor_phone || '770000000',
        party_role: 'تاجر',
        channel: w.bank_name || 'بنك التسويات',
        account_info: `${w.account_name || ''} (${w.account_number || ''})`,
        gross_amount: gross,
        fee_amount: fee,
        net_amount: gross - fee,
        created_at: w.created_at || new Date().toISOString(),
        status: (w.status === 'approved' ? 'completed' : w.status === 'rejected' ? 'failed' : 'pending') as 'completed' | 'pending' | 'failed',
        admin_notes: w.admin_notes || w.admin_statement,
        receipt_url: w.receipt_url || w.receipt_image_url,
      });
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [depositRequests, withdrawalRequests, vendors, profiles]);

  // Filtering
  const filteredItems = useMemo(() => {
    return movementsData.filter(item => {
      const matchesSearch = !searchTerm ||
        item.operation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.party_name.includes(searchTerm) ||
        item.party_phone.includes(searchTerm) ||
        item.channel.includes(searchTerm) ||
        item.account_info.includes(searchTerm);

      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      const itemTime = new Date(item.created_at).getTime();
      const matchesStart = !startDate || itemTime >= new Date(startDate).getTime();
      const matchesEnd = !endDate || itemTime <= new Date(endDate + 'T23:59:59').getTime();

      return matchesSearch && matchesType && matchesStatus && matchesStart && matchesEnd;
    });
  }, [movementsData, searchTerm, typeFilter, statusFilter, startDate, endDate]);

  const totalDeposits = filteredItems
    .filter(i => i.type === 'deposit' && i.status === 'completed')
    .reduce((sum, i) => sum + i.gross_amount, 0);

  const totalWithdrawals = filteredItems
    .filter(i => i.type === 'withdrawal' && i.status === 'completed')
    .reduce((sum, i) => sum + i.gross_amount, 0);

  const pendingCount = filteredItems.filter(i => i.status === 'pending').length;

  const columns: Column<AdminMovementItem>[] = [
    {
      header: 'رقم المرجع الموحد',
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-extrabold text-blue-400 block dir-ltr">
            {row.operation_number}
          </span>
          <span className="text-[10px] text-slate-500 font-mono dir-ltr">{row.id.substring(0, 8)}</span>
        </div>
      ),
    },
    {
      header: 'نوع الحركة',
      accessor: (row) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
          row.type === 'deposit' 
            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
            : 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
        }`}>
          {row.type === 'deposit' ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
          <span>{row.type_label}</span>
        </span>
      ),
    },
    {
      header: 'المستخدم / التاجر',
      accessor: (row) => (
        <div>
          <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
            <span>{row.party_name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
              {row.party_role}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono dir-ltr">{row.party_phone}</div>
        </div>
      ),
    },
    {
      header: 'القناة / الحساب البنكي',
      accessor: (row) => (
        <div>
          <span className="text-xs font-bold text-slate-200 block">{row.channel}</span>
          <span className="text-[11px] text-slate-400 font-mono">{row.account_info}</span>
        </div>
      ),
    },
    {
      header: 'المبلغ الإجمالي',
      accessor: (row) => (
        <span className={`font-mono font-extrabold text-xs dir-ltr block ${
          row.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {row.type === 'deposit' ? '+' : '-'}{row.gross_amount.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'صافي المبلغ',
      accessor: (row) => (
        <span className="font-mono font-bold text-xs text-white dir-ltr block">
          {row.net_amount.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'التاريخ والوقت',
      accessor: (row) => (
        <span className="text-xs text-slate-300 font-mono dir-ltr block">
          {new Date(row.created_at).toLocaleString('ar-YE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'الحالة',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'التفاصيل',
      accessor: (row) => (
        <button
          onClick={() => setSelectedItem(row)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium cursor-pointer flex items-center gap-1 transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>فتح</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-indigo-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              تقرير عمليات السحب والإيداع العام (Admin Deposits & Withdrawals)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            متابعة شاملة لجميع إيداعات المحافظ الإلكترونية ومسحوبات أرباح التجار والتحويلات البنكية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCsv('Admin_Deposits_Withdrawals_Report', filteredItems)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={() => exportToPrint('تقرير السحب والإيداع العام للأدمن', 'admin-movements-table')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي الحركات</span>
          <span className="text-xl font-extrabold text-cyan-400 font-mono">{filteredItems.length}</span>
          <span className="text-[10px] text-slate-500 block">إيداعات وسحوبات</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي الإيداعات المنفذة</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">+{totalDeposits.toLocaleString()} YER</span>
          <span className="text-[10px] text-emerald-500 block font-bold">شحن محافظ العملاء</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي المسحوبات المنفذة</span>
          <span className="text-xl font-extrabold text-purple-400 font-mono">-{totalWithdrawals.toLocaleString()} YER</span>
          <span className="text-[10px] text-purple-500 block font-bold">تسويات أرباح التجار</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">طلبات قيد المراجعة</span>
          <span className="text-xl font-extrabold text-amber-400 font-mono">{pendingCount}</span>
          <span className="text-[10px] text-amber-500 block font-bold">تحتاج إلى تدقيق</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالمرجع، اسم المستخدم، الهاتف، الحساب..."
              className="w-full pr-9 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
          >
            <option value="all">جميع أنواع الحركات</option>
            <option value="deposit">إيداعات محافظ العملاء</option>
            <option value="withdrawal">سحوبات أرباح التجار</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="completed">معتمدة / مكتملة</option>
            <option value="pending">قيد الانتظار</option>
            <option value="failed">مرفوضة</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
            <span className="text-slate-400 text-[11px]">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-100 focus:outline-none w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div id="admin-movements-table">
        <DataTable
          data={filteredItems}
          columns={columns}
          title={`جدول عمليات السحب والإيداع (${filteredItems.length} حركة)`}
          searchPlaceholder="بحث سريع في الحركات المعروضة..."
          exportFilename="admin_movements_report"
        />
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <Modal
          title={`تفاصيل العملية (#${selectedItem.operation_number})`}
          isOpen={true}
          onClose={() => setSelectedItem(null)}
        >
          <div className="space-y-4 text-xs dir-rtl">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">رقم المرجع الموحد:</span>
                <span className="font-mono font-bold text-blue-400 dir-ltr">{selectedItem.operation_number}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">نوع الحركة:</span>
                <span className="font-bold text-white">{selectedItem.type_label}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">الطرف المعني ({selectedItem.party_role}):</span>
                <span className="font-bold text-white">{selectedItem.party_name} ({selectedItem.party_phone})</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">المبلغ الإجمالي:</span>
                <span className="font-mono font-extrabold text-sm text-emerald-400 dir-ltr">
                  {selectedItem.gross_amount.toLocaleString()} YER
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">القناة والحساب:</span>
                <span className="font-bold text-white">{selectedItem.channel} - {selectedItem.account_info}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">حالة الطلب:</span>
                <StatusBadge status={selectedItem.status} />
              </div>
              {selectedItem.admin_notes && (
                <div className="border-t border-slate-900 pt-1.5">
                  <span className="text-slate-400 block mb-1">ملاحظات الإدارة:</span>
                  <div className="p-2 rounded bg-slate-900 text-slate-200">{selectedItem.admin_notes}</div>
                </div>
              )}
            </div>

            {selectedItem.receipt_url && (
              <div className="space-y-2">
                <span className="font-bold text-slate-300 block">إيصال التحويل المرفق:</span>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
                  <img
                    src={selectedItem.receipt_url}
                    alt="إيصال التحويل"
                    className="max-h-64 mx-auto object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
