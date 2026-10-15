import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { 
  FileSpreadsheet, Printer, Search, Calendar, Filter, 
  TrendingUp, DollarSign, Ticket, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { exportToCsv, exportToPrint } from '../../../lib/exportUtils';
import { resolveCardFinancialDetails, resolveOperationNumber, resolveUnifiedCardTransaction } from '../../../lib/ledgerUtils';
import { decryptCardCode } from '../../../lib/encryptionUtils';
import { isCardSold } from '../../../lib/cardStatusUtils';

export interface VendorCardOperationItem {
  id: string;
  operation_number: string;
  is_financial_ref_available: boolean;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  network_name: string;
  category_name: string;
  serial_number: string;
  card_code: string;
  payment_method: string;
  is_fallback?: boolean;
  gross_amount: number;
  commission_rate: number | null;
  platform_commission: number;
  net_amount: number;
  status: 'completed' | 'pending' | 'failed';
  ubtr_reference?: string | null;
}

export const VendorOperationsReport: React.FC = () => {
  const { currentVendor, cards = [], networks = [], categories = [], profiles = [], payments = [], paymentItems = [], wallets = [], getAuthenticatedSupabase } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  const vendorId = currentVendor?.id || '';
  const vendorWallet = wallets.find(w => w.user_id === vendorId || w.id === vendorId);

  // Fetch authentic transactions for vendor wallet to link operations
  const fetchWalletTransactions = useCallback(async () => {
    if (!vendorWallet?.id || !getAuthenticatedSupabase) return;
    try {
      const supabase = getAuthenticatedSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('transactions')
        .select('id, wallet_id, amount, type, status, description, reference_id, created_at, payment_method, transaction_reference')
        .eq('wallet_id', vendorWallet.id)
        .order('created_at', { ascending: true })
        .limit(5000);
      if (!error && data) {
        setWalletTransactions(data);
      }
    } catch (err) {
      console.warn('Could not load wallet transactions for operations report:', err);
    }
  }, [vendorWallet?.id, getAuthenticatedSupabase]);

  useEffect(() => {
    fetchWalletTransactions();
  }, [fetchWalletTransactions]);

  const vendorNetworks = useMemo(() => {
    return vendorId ? networks.filter(n => n.vendor_id === vendorId) : networks;
  }, [networks, vendorId]);

  const vendorNetworkIds = useMemo(() => new Set(vendorNetworks.map(n => n.id)), [vendorNetworks]);

  // Build authentic sold card transactions for this vendor without artificial commission guesswork
  const operationsData: VendorCardOperationItem[] = useMemo(() => {
    const relevantCards = cards.filter(c => {
      // Must belong to vendor's networks and be sold (case-insensitive and null-safe)
      return isCardSold(c) && (!vendorId || vendorNetworkIds.has(c.network_id));
    });

    return relevantCards.map((card: any) => {
      const net = networks.find(n => n.id === card.network_id);
      const cat = categories.find(c => c.id === card.category_id);
      const cust = profiles.find(p => p.id === card.owner_id || p.id === card.sold_to);

      // Derive authentic financial details strictly from financial records
      const finDetails = resolveCardFinancialDetails(card, {
        payments,
        paymentItems,
        transactions: walletTransactions,
      });

      const opNum = finDetails.is_financial_reference_available
        ? (finDetails.financial_reference || 'غير متوفر')
        : 'غير متوفر';

      const dateStr = card.sold_at || card.created_at || new Date().toISOString();

      return {
        id: card.id,
        operation_number: opNum,
        is_financial_ref_available: finDetails.is_financial_reference_available,
        created_at: dateStr,
        customer_name: cust?.name || 'مشترك شبكة معتمد',
        customer_phone: cust?.phone || (cust as any)?.phone_number || '780780525',
        network_name: net?.name || card.network_name || 'شبكة الواي فاي',
        category_name: cat?.name || card.category_name || 'باقة إنترنت',
        serial_number: finDetails.card_serial,
        card_code: decryptCardCode(card.encrypted_code || card.code) || card.code || '••••••••',
        payment_method: finDetails.payment_method,
        is_fallback: finDetails.is_fallback,
        gross_amount: finDetails.gross_amount,
        commission_rate: finDetails.commission_rate,
        platform_commission: finDetails.platform_commission,
        net_amount: finDetails.net_amount,
        status: finDetails.status,
        ubtr_reference: finDetails.ubtr_reference,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [cards, networks, categories, profiles, vendorId, vendorNetworkIds, payments, paymentItems, walletTransactions]);

  // Multi-criteria Filtering
  const filteredOperations = useMemo(() => {
    return operationsData.filter(item => {
      const matchesSearch = !searchTerm || 
        item.operation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer_name.includes(searchTerm) ||
        item.customer_phone.includes(searchTerm) ||
        item.network_name.includes(searchTerm) ||
        item.category_name.includes(searchTerm) ||
        item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.ubtr_reference ? item.ubtr_reference.toLowerCase().includes(searchTerm.toLowerCase()) : false);

      const matchesCat = categoryFilter === 'all' || item.category_name === categoryFilter;
      const matchesNet = networkFilter === 'all' || item.network_name === networkFilter;

      const itemTime = new Date(item.created_at).getTime();
      const matchesStart = !startDate || itemTime >= new Date(startDate).getTime();
      const matchesEnd = !endDate || itemTime <= new Date(endDate + 'T23:59:59').getTime();

      return matchesSearch && matchesCat && matchesNet && matchesStart && matchesEnd;
    });
  }, [operationsData, searchTerm, categoryFilter, networkFilter, startDate, endDate]);

  // Aggregate KPIs
  const totalGross = filteredOperations.reduce((sum, item) => sum + item.gross_amount, 0);
  const totalCommission = filteredOperations.reduce((sum, item) => sum + item.platform_commission, 0);
  const totalNet = filteredOperations.reduce((sum, item) => sum + item.net_amount, 0);

  const columns: Column<VendorCardOperationItem>[] = [
    {
      header: 'المرجع المالي للعملية',
      accessor: (row) => (
        <div className="space-y-0.5">
          {row.is_financial_ref_available ? (
            <span className="font-mono text-xs font-extrabold text-amber-400 block dir-ltr">
              {row.operation_number}
            </span>
          ) : (
            <span className="inline-block text-[10px] text-amber-400/90 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
              غير متوفر (قيد الربط)
            </span>
          )}
          <div className="flex items-center gap-1.5 dir-ltr">
            <span className="text-[10px] text-slate-500 font-mono block">
              S/N: {row.serial_number}
            </span>
            {row.is_fallback && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                (مرجع كرت)
              </span>
            )}
          </div>
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
      header: 'اسم العميل',
      accessor: (row) => (
        <span className="text-xs font-bold text-slate-100 block">{row.customer_name}</span>
      ),
    },
    {
      header: 'رقم حساب العميل',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-cyan-400 dir-ltr block">{row.customer_phone}</span>
      ),
    },
    {
      header: 'اسم الشبكة',
      accessor: (row) => (
        <span className="text-xs font-medium text-slate-200">{row.network_name}</span>
      ),
    },
    {
      header: 'فئة الكرت',
      accessor: (row) => (
        <div>
          <span className="text-xs font-bold text-slate-100">{row.category_name}</span>
          <div className="text-[10px] text-slate-400">{row.payment_method}</div>
        </div>
      ),
    },
    {
      header: 'رقم الكرت',
      accessor: (row) => (
        <div className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-300 dir-ltr bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-700/60 shadow-sm" title={`كود الكرت الفعلي: ${row.card_code}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{row.card_code}</span>
        </div>
      ),
    },
    {
      header: 'المبلغ الإجمالي',
      accessor: (row) => (
        <span className="font-mono font-extrabold text-xs text-white dir-ltr block">
          {row.gross_amount.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'نسبة العمولة',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-amber-300 dir-ltr block">
          {row.commission_rate != null ? `${row.commission_rate}%` : '—'}
        </span>
      ),
    },
    {
      header: 'عمولة المنصة',
      accessor: (row) => (
        <span className="font-mono font-bold text-xs text-purple-400 dir-ltr block">
          -{row.platform_commission.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'صافي المبلغ',
      accessor: (row) => (
        <span className="font-mono font-extrabold text-xs text-emerald-400 dir-ltr block">
          +{row.net_amount.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'حالة العملية',
      accessor: (row) => <StatusBadge status={row.status} customLabel={row.status === 'completed' ? 'ناجحة' : undefined} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-900/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              تقرير عمليات بيع وشراء الكروت التفصيلي
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            سجل دقيق ومفصل لكافة عمليات مبيعات الكروت، عمولات المنصة، وصافي مستحقاتك بالأرقام المرجعية الموحدة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCsv('Vendor_Card_Operations_Report', filteredOperations)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={() => exportToPrint('تقرير عمليات بيع وشراء الكروت للتاجر', 'vendor-card-operations-table')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي الكروت المباعة</span>
          <span className="text-xl font-extrabold text-cyan-400 font-mono">{filteredOperations.length}</span>
          <span className="text-[10px] text-slate-500 block">عملية مبيعات معتمدة</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي المبيعات (المبلغ المرسل)</span>
          <span className="text-xl font-extrabold text-white font-mono">{totalGross.toLocaleString()} YER</span>
          <span className="text-[10px] text-slate-500 block">القيمة الاسمية للكروت</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">عمولات المنصة المستقطعة</span>
          <span className="text-xl font-extrabold text-purple-400 font-mono">{totalCommission.toLocaleString()} YER</span>
          <span className="text-[10px] text-slate-500 block">إجمالي العمولات المستقطعة</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">صافي أرباح التاجر المستحقة</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">{totalNet.toLocaleString()} YER</span>
          <span className="text-[10px] text-emerald-500 font-bold block">متاحة للسحب المباشر</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بـ رقم المرجع، العميل، الهاتف، السيريال..."
              className="w-full pr-9 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
          >
            <option value="all">جميع الشبكات</option>
            {vendorNetworks.map(n => (
              <option key={n.id} value={n.name}>{n.name}</option>
            ))}
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
      <div id="vendor-card-operations-table">
        <DataTable
          data={filteredOperations}
          columns={columns}
          title={`قائمة عمليات بيع وشراء الكروت (${filteredOperations.length} عملية)`}
          searchPlaceholder="بحث سريع في النتائج المعروضة..."
          exportFilename="vendor_card_operations"
        />
      </div>
    </div>
  );
};
