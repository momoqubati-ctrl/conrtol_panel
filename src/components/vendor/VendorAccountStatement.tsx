import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  FileSpreadsheet, Printer, FileText, Search, AlertCircle, RefreshCw
} from 'lucide-react';
import { exportToCsv, exportToBankStatementPdf } from '../../lib/exportUtils';
import { StatusBadge } from '../common/StatusBadge';
import {
  RawTransactionInput,
  StatementRow,
  buildStatementItems,
  calculateRunningBalances,
  filterStatementRows,
} from '../../lib/vendorStatementUtils';

export const VendorAccountStatement: React.FC = () => {
  const { currentVendor, withdrawalRequests, wallets, getAuthenticatedSupabase } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [transactions, setTransactions] = useState<RawTransactionInput[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const vendorId = currentVendor?.id || '';
  const vendorWallet = wallets.find(w => w.user_id === vendorId || w.id === vendorId);
  const vendorWithdrawals = vendorId ? withdrawalRequests.filter(w => w.vendor_id === vendorId) : [];

  // Fetch authentic financial transactions strictly from the transactions table
  const fetchWalletTransactions = useCallback(async () => {
    if (!vendorWallet?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getAuthenticatedSupabase ? getAuthenticatedSupabase() : null;
      if (!supabase) {
        throw new Error('تعذر إنشاء اتصال مصادق مع قاعدة البيانات');
      }

      const { data, error: txError } = await supabase
        .from('transactions')
        .select('id, wallet_id, amount, type, status, description, reference_id, created_at, payment_method, external_wallet_name, transaction_reference')
        .eq('wallet_id', vendorWallet.id)
        .order('created_at', { ascending: true })
        .limit(5000);

      if (txError) {
        throw txError;
      }

      setTransactions((data || []) as RawTransactionInput[]);
    } catch (err: any) {
      console.error('Failed to load wallet transactions:', err);
      setError(err?.message || 'تعذر تحميل حركات المحفظة من السجل المالي عبر RLS');
    } finally {
      setLoading(false);
    }
  }, [vendorWallet?.id, getAuthenticatedSupabase]);

  useEffect(() => {
    fetchWalletTransactions();
  }, [fetchWalletTransactions]);

  // 1. Build chronological statement entries and calculate cumulative running balance
  const fullLedger: StatementRow[] = useMemo(() => {
    const rawItems = buildStatementItems(transactions, vendorWithdrawals);
    return calculateRunningBalances(rawItems);
  }, [transactions, vendorWithdrawals]);

  // 2. Filter entries and calculate accounting summary (Opening, Debit, Credit, Net, Closing)
  const { filtered: filteredLedger, summary } = useMemo(() => {
    return filterStatementRows(fullLedger, {
      searchTerm,
      filterType,
      startDate,
      endDate,
    });
  }, [fullLedger, searchTerm, filterType, startDate, endDate]);

  // 3. Display newest entries first while preserving exact calculated running balance
  const displayLedger = useMemo(() => {
    return [...filteredLedger].reverse();
  }, [filteredLedger]);

  const { openingBalance, totalDebit, totalCredit, netMovement, closingBalance } = summary;

  const handleExportPdf = () => {
    exportToBankStatementPdf({
      vendorName: currentVendor?.business_name || 'تاجر شبكتي المعتمد',
      vendorPhone: currentVendor?.user_phone,
      accountNumber: vendorWallet?.wallet_number || currentVendor?.id?.substring(0, 10) || 'SHB-88902',
      startDate: startDate || 'بداية الحساب',
      endDate: endDate || 'الوقت الحالي',
      openingBalance,
      totalDebit,
      totalCredit,
      netMovement,
      closingBalance,
      entries: displayLedger.map(item => ({
        date: new Date(item.date).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        ref_no: item.ref_no,
        description: item.description,
        debit: item.debit,
        credit: item.credit,
        running_balance: item.running_balance,
        currency: item.currency,
        status: item.status === 'completed' ? 'مكتملة' : item.status === 'failed' ? 'مرفوضة' : 'قيد الانتظار',
      })),
    });
  };

  const handleExportCsv = () => {
    exportToCsv('Bank_Statement', displayLedger.map(item => ({
      'رقم المرجع': item.ref_no,
      'التاريخ والوقت': new Date(item.date).toLocaleString('ar-YE'),
      'البيان والتفاصيل': item.description,
      'مدين (خصم)': item.debit,
      'دائن (إضافة)': item.credit,
      'الرصيد بعد العملية': item.running_balance,
      'العملة': item.currency,
      'الحالة': item.status,
    })));
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>كشف الحساب المالي الرسمي (Bank Statement Style)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            كشف حساب بنكي ومحاسبي معتمد يعرض القيود، المدين، الدائن، والرصيد التراكمي بعد كل عملية مستخرجاً مباشرة من السجل المالي.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-blue-950/50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>تصدير كشف حساب A4 PDF</span>
          </button>
        </div>
      </div>

      {/* RLS or Network Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-rose-300">تنبيه في قيد السجل المالي:</div>
              <div className="text-rose-200 mt-0.5">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchWalletTransactions}
            className="px-3 py-1.5 rounded-xl bg-rose-800 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Accounting Summary Cards (Top Bank Statement Summary) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-bold block mb-1">الرصيد الافتتاحي</span>
          <span className="text-base font-extrabold text-slate-300 font-mono">{openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} YER</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي المدين (الخصم)</span>
          <span className="text-base font-extrabold text-rose-400 font-mono">-{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} YER</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي الدائن (الإيداع)</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">+{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} YER</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs text-slate-400 font-bold block mb-1">صافي الحركة</span>
          <span className="text-base font-extrabold text-cyan-400 font-mono">
            {netMovement >= 0 ? '+' : ''}{netMovement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} YER
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-blue-900/60 shadow-md col-span-2 lg:col-span-1 bg-gradient-to-r from-blue-950/40 to-slate-900">
          <span className="text-xs text-blue-300 font-bold block mb-1">الرصيد الختامي</span>
          <span className="text-lg font-extrabold text-white font-mono">{closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} YER</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم المرجع، البيان، أو تفاصيل القيد..."
            className="w-full pr-9 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
            <span className="text-slate-400 text-[11px]">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
            <span className="text-slate-400 text-[11px]">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-100 focus:outline-none"
            />
          </div>
        </div>

        {/* Type Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-bold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilterType('credit')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              filterType === 'credit' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            دائن (+)
          </button>
          <button
            onClick={() => setFilterType('debit')}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              filterType === 'debit' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            مدين (-)
          </button>
        </div>
      </div>

      {/* Main Bank Statement Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm text-slate-300 dir-rtl">
            <thead className="bg-slate-950 text-xs font-bold text-slate-400 border-b border-slate-800 uppercase">
              <tr>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5">رقم المرجع</th>
                <th className="p-3.5">البيان والتفاصيل المحاسبية</th>
                <th className="p-3.5 text-left">مدين (-)</th>
                <th className="p-3.5 text-left">دائن (+)</th>
                <th className="p-3.5 text-left">الرصيد بعد العملية</th>
                <th className="p-3.5 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>جاري تحميل كشف الحساب من السجل المالي...</span>
                    </div>
                  </td>
                </tr>
              ) : displayLedger.length > 0 ? (
                displayLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 text-xs text-slate-400 font-mono">
                      {new Date(row.date).toLocaleDateString('ar-YE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5 font-mono text-xs font-bold text-cyan-300 dir-ltr">{row.ref_no}</td>
                    <td className="p-3.5 text-xs font-semibold text-slate-100">{row.description}</td>
                    <td className="p-3.5 font-mono font-bold text-rose-400 text-left text-sm dir-ltr">
                      {row.debit > 0 ? `-${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400 text-left text-sm dir-ltr">
                      {row.credit > 0 ? `+${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="p-3.5 font-mono font-extrabold text-cyan-400 text-left text-sm dir-ltr bg-slate-950/30">
                      {row.running_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {row.currency}
                    </td>
                    <td className="p-3.5 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    لا توجد قيود محاسبية مسجلة في السجل المالي مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
