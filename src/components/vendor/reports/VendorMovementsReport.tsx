import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { Modal } from '../../common/Modal';
import { 
  ArrowDownCircle, ArrowUpCircle, FileSpreadsheet, Printer, 
  Search, Calendar, Filter, Wallet, ExternalLink, Eye 
} from 'lucide-react';
import { exportToCsv, exportToPrint } from '../../../lib/exportUtils';
import { resolveOperationNumber } from '../../../lib/ledgerUtils';

export interface VendorMovementItem {
  id: string;
  operation_number: string;
  created_at: string;
  type: 'withdrawal' | 'deposit' | 'adjustment';
  type_label: string;
  channel_info: string;
  account_number: string;
  amount: number;
  balance_after: number;
  status: 'completed' | 'pending' | 'failed';
  admin_notes?: string;
  receipt_url?: string;
}

export const VendorMovementsReport: React.FC = () => {
  const { currentVendor, withdrawalRequests = [], wallets = [] } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<VendorMovementItem | null>(null);

  const vendorId = currentVendor?.id || '';
  const vendorWallet = wallets.find(w => w.user_id === vendorId || w.id === vendorId);
  const currentBalance = vendorWallet?.balance || 0;

  const movementsData: VendorMovementItem[] = useMemo(() => {
    const relevantWithdrawals = vendorId
      ? withdrawalRequests.filter(w => w.vendor_id === vendorId)
      : withdrawalRequests;

    let rollingBalance = currentBalance;

    return relevantWithdrawals.map((w: any) => {
      const opNum = resolveOperationNumber(w);
      const isApproved = w.status === 'approved' || w.status === 'completed';
      const isPending = w.status === 'pending';

      return {
        id: w.id,
        operation_number: opNum,
        created_at: w.created_at || new Date().toISOString(),
        type: 'withdrawal' as const,
        type_label: 'طلب سحب أرباح',
        channel_info: w.bank_name || w.account_name || 'حوالة بنكية / محفظة',
        account_number: w.account_number || 'حساب غير محدد',
        amount: Number(w.amount || 0),
        balance_after: isApproved ? Math.max(0, rollingBalance - Number(w.amount || 0)) : rollingBalance,
        status: (isApproved ? 'completed' : w.status === 'rejected' ? 'failed' : 'pending') as 'completed' | 'pending' | 'failed',
        admin_notes: w.admin_notes || w.admin_statement,
        receipt_url: w.receipt_url || w.receipt_image_url,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [withdrawalRequests, vendorId, currentBalance]);

  // Filtering
  const filteredMovements = useMemo(() => {
    return movementsData.filter(item => {
      const matchesSearch = !searchTerm || 
        item.operation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.channel_info.includes(searchTerm) ||
        item.account_number.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      const itemTime = new Date(item.created_at).getTime();
      const matchesStart = !startDate || itemTime >= new Date(startDate).getTime();
      const matchesEnd = !endDate || itemTime <= new Date(endDate + 'T23:59:59').getTime();

      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [movementsData, searchTerm, statusFilter, startDate, endDate]);

  const totalWithdrawn = filteredMovements
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalPending = filteredMovements
    .filter(m => m.status === 'pending')
    .reduce((sum, m) => sum + m.amount, 0);

  const columns: Column<VendorMovementItem>[] = [
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
      header: 'نوع الحركة',
      accessor: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60">
          <ArrowUpCircle className="w-3.5 h-3.5" />
          <span>{row.type_label}</span>
        </span>
      ),
    },
    {
      header: 'الحساب والمحفظة',
      accessor: (row) => (
        <div>
          <div className="font-bold text-slate-100 text-xs">{row.channel_info}</div>
          <div className="text-[11px] text-slate-400 font-mono dir-ltr">{row.account_number}</div>
        </div>
      ),
    },
    {
      header: 'المبلغ الإجمالي',
      accessor: (row) => (
        <span className="font-mono font-extrabold text-sm text-rose-400 dir-ltr block">
          -{row.amount.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'الرصيد بعد الحركة',
      accessor: (row) => (
        <span className="font-mono font-bold text-xs text-slate-200 dir-ltr block">
          {row.balance_after.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'حالة العملية',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'التفاصيل والإيصال',
      accessor: (row) => (
        <button
          onClick={() => setSelectedMovement(row)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium cursor-pointer flex items-center gap-1 transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>معاينة</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-indigo-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              تقرير عمليات السحب والإيداع وحركات الرصيد
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            سجل شامل لحركات تحويل وسحب الأرباح والحسابات البنكية والإيداعات المعتمدة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCsv('Vendor_Movements_Report', filteredMovements)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={() => exportToPrint('تقرير عمليات السحب والإيداع للتاجر', 'vendor-movements-table')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي الحركات</span>
          <span className="text-xl font-extrabold text-cyan-400 font-mono">{filteredMovements.length}</span>
          <span className="text-[10px] text-slate-500 block">حركة مالية مسجلة</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي المسحوبات المنفذة</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">{totalWithdrawn.toLocaleString()} YER</span>
          <span className="text-[10px] text-emerald-500 block font-bold">تم تحويلها لحساباتك بنجاح</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">سحوبات قيد الانتظار</span>
          <span className="text-xl font-extrabold text-amber-400 font-mono">{totalPending.toLocaleString()} YER</span>
          <span className="text-[10px] text-amber-500 block font-bold">بانتظار موافقة الإدارة</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم المرجع أو البنك أو الحساب..."
              className="w-full pr-9 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="completed">معتمدة / ناجحة</option>
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

          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
            <span className="text-slate-400 text-[11px]">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-100 focus:outline-none w-full"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div id="vendor-movements-table">
        <DataTable
          data={filteredMovements}
          columns={columns}
          title={`جدول عمليات السحب والإيداع (${filteredMovements.length} حركة)`}
          searchPlaceholder="بحث سريع في الحركات المعروضة..."
          exportFilename="vendor_movements_report"
        />
      </div>

      {/* Movement Details Modal */}
      {selectedMovement && (
        <Modal
          title={`تفاصيل الحركة المالية (#${selectedMovement.operation_number})`}
          isOpen={true}
          onClose={() => setSelectedMovement(null)}
        >
          <div className="space-y-4 text-xs dir-rtl">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">رقم المرجع الموحد:</span>
                <span className="font-mono font-bold text-blue-400 dir-ltr">{selectedMovement.operation_number}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">نوع الحركة:</span>
                <span className="font-bold text-white">{selectedMovement.type_label}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">المبلغ:</span>
                <span className="font-mono font-extrabold text-sm text-emerald-400 dir-ltr">
                  {selectedMovement.amount.toLocaleString()} YER
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">الحساب المحول إليه:</span>
                <span className="font-bold text-white">{selectedMovement.channel_info} - {selectedMovement.account_number}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">حالة الطلب:</span>
                <StatusBadge status={selectedMovement.status} />
              </div>
              {selectedMovement.admin_notes && (
                <div className="border-t border-slate-900 pt-1.5">
                  <span className="text-slate-400 block mb-1">ملاحظات الإدارة:</span>
                  <div className="p-2 rounded bg-slate-900 text-slate-200">{selectedMovement.admin_notes}</div>
                </div>
              )}
            </div>

            {selectedMovement.receipt_url && (
              <div className="space-y-2">
                <span className="font-bold text-slate-300 block">إيصال التحويل البنكي المرفق:</span>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
                  <img
                    src={selectedMovement.receipt_url}
                    alt="إيصال التحويل"
                    className="max-h-64 mx-auto object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedMovement(null)}
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
