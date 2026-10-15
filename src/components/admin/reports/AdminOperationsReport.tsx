import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { Modal } from '../../common/Modal';
import { 
  FileSpreadsheet, Printer, Search, CreditCard, Eye, 
  Layers, CheckCircle2, AlertTriangle, XCircle, Info, Hash, RefreshCw, Lock
} from 'lucide-react';
import { exportToCsv, exportToPrint } from '../../../lib/exportUtils';
import { resolveOperationNumber, resolveUnifiedCardTransaction } from '../../../lib/ledgerUtils';
import { decryptCardCode } from '../../../lib/encryptionUtils';

export interface AdminCardOperationItem {
  id: string;
  payment_id: string;
  platform_ref: string;
  gateway_ref: string;
  created_at: string;
  payment_method: string;
  customer_name: string;
  customer_account: string;
  network_name: string;
  vendor_name: string;
  vendor_account: string;
  category_name: string;
  serial_number: string;
  card_code: string;
  encrypted_code: string;
  is_code_encrypted: boolean;
  gross_amount: number;
  platform_commission: number;
  gateway_fee: number;
  vendor_net: number;
  platform_net: number;
  status_code: string;
  error_symbol: string;
  gateway_response: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'reconciliation_required';
  raw_payload?: any;
}

export const AdminOperationsReport: React.FC = () => {
  const { 
    cards = [], 
    payments = [], 
    paymentItems = [],
    networks = [], 
    vendors = [], 
    categories = [], 
    profiles = [],
    wallets = [],
    walletsConfig = []
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOp, setSelectedOp] = useState<AdminCardOperationItem | null>(null);

  // Build Comprehensive Admin Card Purchases & Sales Report (All Operations)
  const operationsData: AdminCardOperationItem[] = useMemo(() => {
    const items: AdminCardOperationItem[] = [];

    // 1. Process ALL payment records (completed, pending, reconciliation_required, failed, refunded)
    payments.filter(p => p != null).forEach((p: any) => {
      const cust = profiles.find(pr => pr.id === p.user_id);
      const cat = categories.find(c => c.id === p.category_id);
      const net = cat ? networks.find(n => n.id === cat.network_id) : null;
      const vendor = net ? vendors.find(v => v.id === net.vendor_id) : null;

      // Vendor Account resolution
      const allMatchingPaymentItems = paymentItems.filter((pi: any) => pi && pi.payment_id === p.id);
      const pItem = allMatchingPaymentItems[0];
      const vWallet = wallets.find(w => w.user_id === vendor?.id);
      const vProfile = profiles.find(pr => pr.id === vendor?.id);
      const vendorAcc = pItem?.network_owner_account_snapshot || 
        vWallet?.wallet_number || 
        vProfile?.phone || 
        vendor?.user_phone || 
        (vendor?.id ? `ACC-${vendor.id.substring(0, 8).toUpperCase()}` : '770000000');

      // Comprehensive Card Matching
      const matchedCard = cards.find(c => {
        if (!c) return false;
        if (c.reserved_for_payment_id === p.id) return true;
        if (c.payment_item_id && allMatchingPaymentItems.some((pi: any) => pi.id === c.payment_item_id)) return true;
        if (p.metadata?.card_id && c.id === p.metadata.card_id) return true;
        if (Array.isArray(p.metadata?.card_ids) && p.metadata.card_ids.includes(c.id)) return true;
        if (allMatchingPaymentItems.some((pi: any) => pi.card_id === c.id || (Array.isArray(pi.card_ids) && pi.card_ids.includes(c.id)))) return true;
        if (p.user_id && (c.owner_id === p.user_id || c.sold_to === p.user_id) && c.status === 'sold' && c.sold_at && p.created_at) {
          const diffMs = Math.abs(new Date(c.sold_at).getTime() - new Date(p.created_at).getTime());
          if (diffMs < 300000 && (!p.category_id || c.category_id === p.category_id)) return true;
        }
        return false;
      });

      const rawEncrypted = matchedCard?.encrypted_code || 
        matchedCard?.code || 
        p.metadata?.encrypted_code || 
        `B7arJ6tp-${String(p.id).substring(0, 8)}`;

      const decrypted = decryptCardCode(rawEncrypted) || 
        matchedCard?.code || 
        p.metadata?.decrypted_code || 
        p.metadata?.card_code || 
        (matchedCard?.code && !matchedCard.code.includes('•') ? matchedCard.code : rawEncrypted);

      const isCompleted = p.status === 'completed';
      const isEncrypted = !isCompleted;
      const cardCode = isCompleted ? decrypted : rawEncrypted;

      const gross = Number(p.total_amount || p.amount || 100);
      const commRate = vendor?.commission_rate ?? 5.0;
      const comm = Math.round(gross * (commRate / 100));

      const basConfig = walletsConfig.find(w => w.provider === (p.provider || 'basgate'));
      const feePercent = basConfig?.fee_percentage !== undefined ? basConfig.fee_percentage : (p.provider === 'basgate' ? 1.5 : 0);
      const fixedFee = basConfig?.fixed_fee ?? 0;
      const isGateway = p.provider === 'basgate' || !p.provider;
      const gwFee = isGateway ? Math.round((gross * (feePercent / 100)) + fixedFee) : 0;
      const masterRef = resolveOperationNumber(p);

      // Extract Status Code, Error Symbol & Gateway response
      let statusCode = p.metadata?.payment_status_code || p.metadata?.status_code || p.metadata?.code || '';
      let errSymbol = p.metadata?.error_symbol || p.metadata?.failure_code || p.metadata?.error_code || '';
      let gwResponse = p.failure_reason || '';

      if (!statusCode && gwResponse) {
        const match = gwResponse.match(/paymentStatus:\s*(\d+)/i) || gwResponse.match(/(\d{4})/);
        if (match) {
          statusCode = match[1];
        }
      }

      if (!errSymbol) {
        if (p.status === 'completed') {
          errSymbol = 'SUCCESS';
        } else if (p.status === 'pending') {
          errSymbol = 'PENDING_IN_PROGRESS';
        } else if (p.status === 'reconciliation_required') {
          errSymbol = 'RECONCILIATION_REQUIRED';
        } else if (statusCode === '1205' || gwResponse.includes('cancelled') || gwResponse.includes('aborted') || p.status === 'refunded') {
          errSymbol = 'USER_CANCELLED';
        } else if (statusCode === '1203' || p.status === 'failed') {
          errSymbol = 'PAYMENT_FAILED';
        } else {
          errSymbol = 'OPERATION_PROCESSED';
        }
      }

      if (!statusCode) {
        statusCode = p.status === 'completed' ? '1202' : (p.status === 'pending' ? '1001' : (p.status === 'failed' ? '1203' : '1205'));
      }

      if (!gwResponse && p.metadata) {
        gwResponse = p.metadata.error_message || p.metadata.gateway_message || p.metadata.message || p.metadata.status || '';
      }
      if (!gwResponse) {
        if (p.status === 'completed') {
          gwResponse = 'تم استلام المبلغ وتأكيد الدفع بنجاح من البوابة';
        } else if (p.status === 'pending') {
          gwResponse = 'العملية قيد المتابعة لدى مزود الخدمة';
        } else if (p.status === 'reconciliation_required') {
          gwResponse = 'العملية معلقة وبحاجة لمطابقة القيود المالية';
        } else if (p.status === 'refunded') {
          gwResponse = 'تم إلغاء العملية واسترداد المبلغ إدارياً';
        } else {
          gwResponse = 'فشلت المعاملة لدى مزود الخدمة';
        }
      }

      const gwRef = p.provider_reference || 
        (p.provider === 'basgate' ? `BAS-${String(p.id).substring(0, 8).toUpperCase()}` : `PAY-${String(p.id).substring(0, 8).toUpperCase()}`);

      items.push({
        id: p.id,
        payment_id: p.id,
        platform_ref: masterRef,
        gateway_ref: gwRef,
        created_at: p.created_at || new Date().toISOString(),
        payment_method: p.provider === 'basgate' ? 'بوابة BasGate' : (p.provider === 'pyes' ? 'محفظة بيس' : 'محفظة التطبيق'),
        customer_name: cust?.name || p.metadata?.customer_name || 'مشترك شبكتي',
        customer_account: cust?.phone || (cust as any)?.phone_number || p.metadata?.phone || p.metadata?.customer_phone || '780780525',
        network_name: net?.name || 'شبكة الواي فاي',
        vendor_name: vendor?.business_name || 'إدارة المنصة',
        vendor_account: vendorAcc,
        category_name: cat?.name || p.metadata?.category_name || 'باقة كروت',
        serial_number: p.metadata?.card_serial || `PAY-SN-${String(p.id).substring(0, 8).toUpperCase()}`,
        card_code: cardCode,
        encrypted_code: rawEncrypted,
        is_code_encrypted: isEncrypted,
        gross_amount: gross,
        platform_commission: comm,
        gateway_fee: gwFee,
        vendor_net: gross - comm,
        platform_net: comm - gwFee,
        status_code: String(statusCode),
        error_symbol: String(errSymbol),
        gateway_response: gwResponse,
        status: p.status,
        raw_payload: p.metadata || {},
      });
    });

    // 2. Include cards with status 'sold' or 'reserved' that are not represented in payments
    cards.filter(c => c && (c.status === 'sold' || c.status === 'reserved')).forEach((card: any) => {
      // Robust deduplication: prevent any card associated with an existing payment from duplicating
      const isAlreadyRepresented = items.some(i => 
        i.payment_id === card.reserved_for_payment_id || 
        i.id === card.reserved_for_payment_id || 
        (card.payment_item_id && paymentItems.some((pi: any) => pi.id === card.payment_item_id && pi.payment_id === i.payment_id)) ||
        i.id === card.id
      );
      if (isAlreadyRepresented) {
        return;
      }
      const net = networks.find(n => n.id === card.network_id);
      const vendor = net ? vendors.find(v => v.id === net.vendor_id) : null;
      const cat = categories.find(c => c.id === card.category_id);
      const cust = profiles.find(p => p.id === card.owner_id || p.id === card.sold_to);

      const vWallet = wallets.find(w => w.user_id === vendor?.id);
      const vProfile = profiles.find(pr => pr.id === vendor?.id);
      const vendorAcc = vWallet?.wallet_number || 
        vProfile?.phone || 
        vendor?.user_phone || 
        (vendor?.id ? `ACC-${vendor.id.substring(0, 8).toUpperCase()}` : '770000000');

      const rawEncrypted = card.encrypted_code || card.code || `B7arJ6tp-${String(card.id).substring(0, 8)}`;
      const decrypted = decryptCardCode(rawEncrypted) || card.code || rawEncrypted;

      const isCompleted = card.status === 'sold';
      const isEncrypted = !isCompleted;
      const cardCode = isCompleted ? decrypted : rawEncrypted;

      const gross = Number(card.price || cat?.price || 100);
      const commRate = vendor?.commission_rate ?? 5.0;
      const comm = Math.round(gross * (commRate / 100));

      const resolved = resolveUnifiedCardTransaction(card, { payments, paymentItems });
      const masterRef = resolved.ubtr;
      const gwRef = card.ubtr_reference || `INV-${masterRef}`;

      items.push({
        id: card.id,
        payment_id: card.id,
        platform_ref: masterRef,
        gateway_ref: gwRef,
        created_at: card.sold_at || card.created_at || new Date().toISOString(),
        payment_method: resolved.payment_method,
        customer_name: cust?.name || 'مشترك شبكتي',
        customer_account: cust?.phone || (cust as any)?.phone_number || '780780525',
        network_name: net?.name || 'شبكة الواي فاي',
        vendor_name: vendor?.business_name || 'تاجر شبكة معتمد',
        vendor_account: vendorAcc,
        category_name: cat?.name || card.category_name || 'باقة كروت',
        serial_number: card.serial_number || String(card.id).substring(0, 10).toUpperCase(),
        card_code: cardCode,
        encrypted_code: rawEncrypted,
        is_code_encrypted: isEncrypted,
        gross_amount: gross,
        platform_commission: comm,
        gateway_fee: 0,
        vendor_net: gross - comm,
        platform_net: comm,
        status_code: card.status === 'sold' ? '1202' : '1001',
        error_symbol: card.status === 'sold' ? 'SUCCESS' : 'PENDING_IN_PROGRESS',
        gateway_response: card.status === 'sold' ? 'تم تسليم الكرت بنجاح للمشترك' : 'الكرت محجوز للعملية',
        status: card.status === 'sold' ? 'completed' : 'pending',
        raw_payload: {},
      });
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [cards, payments, paymentItems, networks, vendors, categories, profiles, wallets, walletsConfig]);

  // Filtering
  const filteredData = useMemo(() => {
    return operationsData.filter(item => {
      const matchesSearch = !searchTerm ||
        item.platform_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.gateway_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer_name.includes(searchTerm) ||
        item.customer_account.includes(searchTerm) ||
        item.network_name.includes(searchTerm) ||
        item.vendor_name.includes(searchTerm) ||
        item.vendor_account.includes(searchTerm) ||
        item.card_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.encrypted_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.status_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.error_symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.gateway_response.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serial_number.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesChannel = channelFilter === 'all' || item.payment_method.includes(channelFilter);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      const itemTime = new Date(item.created_at).getTime();
      const matchesStart = !startDate || itemTime >= new Date(startDate).getTime();
      const matchesEnd = !endDate || itemTime <= new Date(endDate + 'T23:59:59').getTime();

      return matchesSearch && matchesChannel && matchesStatus && matchesStart && matchesEnd;
    });
  }, [operationsData, searchTerm, channelFilter, statusFilter, startDate, endDate]);

  // KPI calculations
  const totalVolume = filteredData.reduce((sum, item) => sum + item.gross_amount, 0);
  const totalPlatformCommission = filteredData.reduce((sum, item) => sum + item.platform_commission, 0);
  const totalGatewayFees = filteredData.reduce((sum, item) => sum + item.gateway_fee, 0);
  const totalVendorNet = filteredData.reduce((sum, item) => sum + item.vendor_net, 0);
  const totalPlatformNet = filteredData.reduce((sum, item) => sum + item.platform_net, 0);

  // Columns including Network Owner Account & Card Number (Unencrypted when completed, Encrypted when pending)
  const columns: Column<AdminCardOperationItem>[] = [
    {
      header: 'رقم مرجع العملية الموحد',
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-extrabold text-blue-400 block dir-ltr">
            {row.platform_ref}
          </span>
          <span className="text-[10px] text-slate-500 font-mono dir-ltr">{row.payment_id.substring(0, 8)}</span>
        </div>
      ),
    },
    {
      header: 'مرجع بوابة الدفع / المزود',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-amber-400 block dir-ltr">
          {row.gateway_ref}
        </span>
      ),
    },
    {
      header: 'التاريخ والتوقيت',
      accessor: (row) => (
        <span className="text-xs text-slate-300 font-mono dir-ltr block">
          {new Date(row.created_at).toLocaleString('ar-YE', {
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
        <span className="font-mono text-xs font-bold text-cyan-400 dir-ltr block">{row.customer_account}</span>
      ),
    },
    {
      header: 'الشبكة والتاجر',
      accessor: (row) => (
        <div>
          <div className="font-bold text-slate-100 text-xs">{row.network_name}</div>
          <div className="text-[11px] text-slate-400">{row.vendor_name}</div>
        </div>
      ),
    },
    {
      header: 'حساب صاحب الشبكة',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-emerald-400 dir-ltr block">
          {row.vendor_account}
        </span>
      ),
    },
    {
      header: 'فئة الكرت',
      accessor: (row) => (
        <span className="text-xs font-bold text-slate-200">{row.category_name}</span>
      ),
    },
    {
      header: 'رقم الكرت',
      accessor: (row) => {
        if (!row.is_code_encrypted) {
          // العملية ناجحة: يظهر الكرت بدون تشفير
          return (
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-300 dir-ltr bg-emerald-950/70 px-2 py-1 rounded-lg border border-emerald-700/60 shadow-sm" title={`كود الكرت الفعلي: ${row.card_code}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{row.card_code}</span>
            </div>
          );
        } else {
          // العملية معلقة: يظهر الكرت بالتشفير
          return (
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-amber-300 dir-ltr bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-800/60 max-w-[140px] shadow-sm" title={`الكرت مشفر (العملية معلقة): ${row.encrypted_code}`}>
              <Lock className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">{row.encrypted_code}</span>
            </div>
          );
        }
      },
    },
    {
      header: 'المبلغ المرسل',
      accessor: (row) => (
        <span className="font-mono font-extrabold text-xs text-white dir-ltr block">
          {row.gross_amount.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'عمولة المنصة',
      accessor: (row) => (
        <span className="font-mono font-bold text-xs text-purple-400 dir-ltr block">
          +{row.platform_commission.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'عمولة البوابة',
      accessor: (row) => (
        <span className="font-mono text-xs text-rose-400 dir-ltr block">
          {row.gateway_fee > 0 ? `-${row.gateway_fee.toLocaleString()} YER` : '0 YER'}
        </span>
      ),
    },
    {
      header: 'صافي التاجر',
      accessor: (row) => (
        <span className="font-mono font-bold text-xs text-emerald-400 dir-ltr block">
          {row.vendor_net.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'صافي المنصة',
      accessor: (row) => (
        <span className="font-mono font-bold text-xs text-cyan-400 dir-ltr block">
          +{row.platform_net.toLocaleString()} YER
        </span>
      ),
    },
    {
      header: 'كود الحالة والرمز',
      accessor: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">الكود:</span>
            <span className="font-mono text-xs font-extrabold px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-amber-800/50 dir-ltr inline-block shadow-sm">
              {row.status_code}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">الرمز:</span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-700 dir-ltr inline-block">
              {row.error_symbol}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'رد مزود الخدمة',
      accessor: (row) => (
        <div className="max-w-xs">
          <span className="text-xs text-slate-200 font-medium line-clamp-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg" title={row.gateway_response}>
            {row.gateway_response}
          </span>
        </div>
      ),
    },
    {
      header: 'حالة العملية',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <button
            onClick={() => setSelectedOp(row)}
            title="عرض التفاصيل والسجل الكامل"
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const handleExportCsv = () => {
    const exportRows = filteredData.map(item => ({
      'رقم مرجع العملية الموحد': item.platform_ref,
      'معرف الدفع الداخلي': item.payment_id,
      'مرجع بوابة الدفع': item.gateway_ref,
      'التاريخ والتوقيت': item.created_at,
      'العميل': item.customer_name,
      'رقم حساب العميل': item.customer_account,
      'الشبكة': item.network_name,
      'التاجر': item.vendor_name,
      'حساب صاحب الشبكة': item.vendor_account,
      'فئة الكرت': item.category_name,
      'رقم الكرت': item.is_code_encrypted ? item.encrypted_code : item.card_code,
      'حالة تشفير الكرت': item.is_code_encrypted ? 'مشفر (معلقة)' : 'غير مشفر (ناجحة)',
      'المبلغ المرسل': item.gross_amount,
      'عمولة المنصة': item.platform_commission,
      'عمولة البوابة': item.gateway_fee,
      'صافي التاجر': item.vendor_net,
      'صافي المنصة': item.platform_net,
      'كود الحالة': item.status_code,
      'رمز الخطأ': item.error_symbol,
      'رد مزود الخدمة': item.gateway_response,
      'حالة العملية': item.status,
    }));
    exportToCsv('Admin_All_Card_Operations_Report', exportRows);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/50 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-blue-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              تقرير كافة عمليات بيع وشراء الكروت (All Card Operations Engine)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            سجل التدقيق الشامل لكافة عمليات الكروت (الناجحة والمعلقة) مع تفاصيل الحسابات وأرقام الكروت المحدثة والمشفرة بحسب حالة العملية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={() => exportToPrint('تقرير كافة عمليات بيع وشراء الكروت للأدمن', 'admin-all-card-operations-table')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي العمليات المسجلة</span>
          <span className="text-xl font-extrabold text-cyan-400 font-mono">{filteredData.length}</span>
          <span className="text-[10px] text-slate-500 block">عملية بيع وشراء</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">حجم المعاملات الإجمالي</span>
          <span className="text-xl font-extrabold text-white font-mono">{totalVolume.toLocaleString()} YER</span>
          <span className="text-[10px] text-slate-500 block">القيمة الاسمية الإجمالية</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">عمولات المنصة</span>
          <span className="text-xl font-extrabold text-purple-400 font-mono">+{totalPlatformCommission.toLocaleString()} YER</span>
          <span className="text-[10px] text-slate-500 block">إجمالي عمولات النظام</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">رسوم بوابات الدفع</span>
          <span className="text-xl font-extrabold text-rose-400 font-mono">-{totalGatewayFees.toLocaleString()} YER</span>
          <span className="text-[10px] text-slate-500 block">تكاليف BasGate والبنوك</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-[11px] text-slate-400 font-bold block mb-1">صافي ربح المنصة</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">+{totalPlatformNet.toLocaleString()} YER</span>
          <span className="text-[10px] text-emerald-500 font-bold block">الربح الصافي النهائي</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالمرجع، الحساب، التاجر، كود الكرت، الرد..."
              className="w-full pr-9 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
          >
            <option value="all">كافة حالات العمليات</option>
            <option value="completed">ناجحة ومكتملة (Completed)</option>
            <option value="pending">قيد المعالجة (Pending)</option>
            <option value="reconciliation_required">تحت المطابقة (Reconciliation)</option>
            <option value="failed">عمليات فاشلة (Failed)</option>
            <option value="refunded">مستردة وملغاة (Refunded)</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
          >
            <option value="all">جميع قنوات الدفع</option>
            <option value="بوابة BasGate">بوابة BasGate</option>
            <option value="محفظة بيس">محفظة بيس</option>
            <option value="محفظة التطبيق">محفظة التطبيق</option>
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
      <div id="admin-all-card-operations-table">
        <DataTable
          data={filteredData}
          columns={columns}
          title={`جدول كافة عمليات بيع وشراء الكروت (${filteredData.length} عملية)`}
          searchPlaceholder="بحث سريع في الجدول المعروض..."
          exportFilename="admin_all_card_operations_report"
        />
      </div>

      {/* READ-ONLY AUDIT & TRANSACTION DETAILS MODAL */}
      {selectedOp && (
        <Modal
          title={`تفاصيل وتدقيق العملية (#${selectedOp.platform_ref})`}
          isOpen={true}
          onClose={() => setSelectedOp(null)}
        >
          <div className="space-y-4 text-xs dir-rtl">
            {/* Status & References Banner */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">حالة المعاملة الحالية:</span>
                <StatusBadge status={selectedOp.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">رقم المرجع الموحد (Platform UBTR):</span>
                  <span className="font-mono text-blue-400 font-bold text-xs dir-ltr block">{selectedOp.platform_ref}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">مرجع مزود الدفع (Gateway Reference):</span>
                  <span className="font-mono text-amber-400 font-bold text-xs dir-ltr block">{selectedOp.gateway_ref}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">معرف العملية الداخلي (ID):</span>
                  <span className="font-mono text-slate-300 dir-ltr block">{selectedOp.payment_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">التاريخ والتوقيت:</span>
                  <span className="font-mono text-slate-300 dir-ltr block">{new Date(selectedOp.created_at).toLocaleString('ar-YE')}</span>
                </div>
              </div>
            </div>

            {/* Card Code Security Display */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5 font-bold">رقم الكرت (كود التفعيل):</span>
                <span className="font-mono font-extrabold text-sm dir-ltr block text-emerald-400">
                  {selectedOp.is_code_encrypted ? selectedOp.encrypted_code : selectedOp.card_code}
                </span>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                !selectedOp.is_code_encrypted 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {!selectedOp.is_code_encrypted ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>مفكوك التشفير (عملية ناجحة)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>مشفر (عملية معلقة)</span>
                  </>
                )}
              </span>
            </div>

            {/* Parties & Pricing */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>أطراف المعاملة وتوزيع المبالغ</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>العميل: <span className="font-bold text-white">{selectedOp.customer_name}</span></div>
                <div>رقم حساب العميل: <span className="font-mono text-cyan-400 dir-ltr inline-block">{selectedOp.customer_account}</span></div>
                <div>الشبكة: <span className="font-bold text-white">{selectedOp.network_name}</span></div>
                <div>التاجر المعتمد: <span className="font-bold text-white">{selectedOp.vendor_name}</span></div>
                <div>حساب صاحب الشبكة: <span className="font-mono text-emerald-400 dir-ltr inline-block font-bold">{selectedOp.vendor_account}</span></div>
                <div>فئة الكرت: <span className="font-bold text-white">{selectedOp.category_name}</span></div>
                <div>قناة الدفع: <span className="font-bold text-purple-300">{selectedOp.payment_method}</span></div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-center">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">المبلغ الإجمالي</div>
                  <div className="font-mono font-bold text-white dir-ltr">{selectedOp.gross_amount.toLocaleString()} YER</div>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">عمولة المنصة</div>
                  <div className="font-mono font-bold text-purple-400 dir-ltr">+{selectedOp.platform_commission.toLocaleString()} YER</div>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">رسوم البوابة</div>
                  <div className="font-mono font-bold text-rose-400 dir-ltr">-{selectedOp.gateway_fee.toLocaleString()} YER</div>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">صافي التاجر</div>
                  <div className="font-mono font-bold text-emerald-400 dir-ltr">{selectedOp.vendor_net.toLocaleString()} YER</div>
                </div>
              </div>
            </div>

            {/* Gateway Response & Status Codes */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>رموز واستجابة بوابة الدفع</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">كود الحالة (Status Code):</span>
                  <span className="font-mono font-bold text-amber-300 text-xs dir-ltr">{selectedOp.status_code}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">رمز الخطأ (Error Symbol):</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs dir-ltr">{selectedOp.error_symbol}</span>
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-200">
                <span className="text-slate-400 block text-[10px] mb-1">الرد التوضيحي من مزود الخدمة:</span>
                <span className="font-medium text-xs text-amber-200">{selectedOp.gateway_response}</span>
              </div>
            </div>

            {/* Raw JSON Payload */}
            {selectedOp.raw_payload && Object.keys(selectedOp.raw_payload).length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1 font-bold text-[10px]">بيانات الاستجابة والبيانات الوصفية (Metadata):</span>
                <pre className="p-2.5 rounded-lg bg-black/60 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-36 border border-slate-800/80 dir-ltr text-left">
                  {JSON.stringify(selectedOp.raw_payload, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
