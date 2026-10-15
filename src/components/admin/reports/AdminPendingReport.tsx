import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { DataTable, Column } from '../../common/DataTable';
import { StatusBadge } from '../../common/StatusBadge';
import { Modal } from '../../common/Modal';
import { 
  AlertTriangle, CheckCircle2, XCircle, Clock, FileSpreadsheet, 
  Printer, Search, ExternalLink, ShieldAlert, Zap, RefreshCw, MessageSquare, Lock
} from 'lucide-react';
import { exportToCsv, exportToPrint } from '../../../lib/exportUtils';
import { resolveOperationNumber } from '../../../lib/ledgerUtils';
import { decryptCardCode } from '../../../lib/encryptionUtils';

export interface PendingOperationItem {
  id: string;
  payment_id: string;
  platform_ref: string;
  gateway_ref: string;
  created_at: string;
  customer_name: string;
  customer_account: string;
  network_name: string;
  vendor_name: string;
  vendor_account: string;
  category_name: string;
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
  status: 'pending' | 'reconciliation_required';
  raw_payload?: any;
}

export const AdminPendingReport: React.FC = () => {
  const { 
    payments = [], 
    cards = [], 
    paymentItems = [],
    networks = [], 
    vendors = [], 
    categories = [], 
    profiles = [],
    wallets = [],
    walletsConfig = [],
    adminForceDeliverCards,
    adminRefundPayment,
    adminQueryPaymentStatus,
    refetchFromDb
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOp, setSelectedOp] = useState<PendingOperationItem | null>(null);
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [isQueryingStatus, setIsQueryingStatus] = useState<boolean>(false);
  const [actionReason, setActionReason] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Build Real Pending Transactions
  const pendingData: PendingOperationItem[] = useMemo(() => {
    const items: PendingOperationItem[] = [];

    // 1. Pending Payments from payments table
    payments.filter(p => p && (p.status === 'pending' || p.status === 'reconciliation_required')).forEach((p: any) => {
      const cust = profiles.find(pr => pr.id === p.user_id);
      const cat = categories.find(c => c.id === p.category_id);
      const net = cat ? networks.find(n => n.id === cat.network_id) : null;
      const vendor = net ? vendors.find(v => v.id === net.vendor_id) : null;

      // Vendor Account resolution
      const pItem = paymentItems.find((pi: any) => pi.payment_id === p.id);
      const vWallet = wallets.find(w => w.user_id === vendor?.id);
      const vProfile = profiles.find(pr => pr.id === vendor?.id);
      const vendorAcc = pItem?.network_owner_account_snapshot || 
        vWallet?.wallet_number || 
        vProfile?.phone || 
        vendor?.user_phone || 
        (vendor?.id ? `ACC-${vendor.id.substring(0, 8).toUpperCase()}` : '770000000');

      // Card Code resolution (Encrypted because operation is pending)
      const matchedCard = cards.find(c => 
        c.reserved_for_payment_id === p.id || 
        (pItem && c.payment_item_id === pItem.id) || 
        (p.metadata?.card_id && c.id === p.metadata.card_id)
      );

      const rawEncrypted = matchedCard?.encrypted_code || 
        p.metadata?.encrypted_code || 
        matchedCard?.code || 
        `B7arJ6tp-${String(p.id).substring(0, 8)}`;

      const decrypted = decryptCardCode(rawEncrypted) || 
        p.metadata?.decrypted_code || 
        p.metadata?.card_code || 
        (matchedCard?.code && !matchedCard.code.includes('•') ? matchedCard.code : rawEncrypted);

      const gross = Number(p.total_amount || p.amount || 100);
      const comm = Math.round(gross * 0.05);
      const basConfig = walletsConfig.find(w => w.provider === (p.provider || 'basgate'));
      const feePercent = basConfig?.fee_percentage !== undefined ? basConfig.fee_percentage : 1.5;
      const fixedFee = basConfig?.fixed_fee ?? 0;
      const gwFee = (p.provider === 'basgate' || !p.provider) ? Math.round((gross * (feePercent / 100)) + fixedFee) : 0;
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
        if (statusCode === '1205' || gwResponse.includes('cancelled') || gwResponse.includes('aborted')) {
          errSymbol = 'USER_CANCELLED';
        } else if (statusCode === '1203') {
          errSymbol = 'PAYMENT_FAILED';
        } else if (statusCode === '1204') {
          errSymbol = 'UNKNOWN_FAILURE';
        } else if (statusCode === '1501') {
          errSymbol = 'GATEWAY_ERROR';
        } else if (gwResponse.includes('AUTO_CANCELLED')) {
          errSymbol = 'AUTO_CANCELLED_TIMEOUT';
        } else {
          errSymbol = p.status === 'pending' ? 'PENDING_IN_PROGRESS' : 'UNKNOWN_ERROR';
        }
      }

      if (!statusCode) {
        statusCode = p.status === 'pending' ? '1001' : '500';
      }

      if (!gwResponse && p.metadata) {
        gwResponse = p.metadata.error_message || p.metadata.gateway_message || p.metadata.message || p.metadata.status || '';
      }
      if (!gwResponse) {
        gwResponse = 'العملية قيد المتابعة ولم يصدر مزود البوابة رمز خطأ نهائي بعد';
      }

      items.push({
        id: p.id,
        payment_id: p.id,
        platform_ref: masterRef,
        gateway_ref: p.provider_reference || `BAS-PENDING-${String(p.id).substring(0, 8).toUpperCase()}`,
        created_at: p.created_at || new Date().toISOString(),
        customer_name: cust?.name || 'مشترك شبكتي',
        customer_account: cust?.phone || (cust as any)?.phone_number || '780780525',
        network_name: net?.name || 'شبكة الواي فاي',
        vendor_name: vendor?.business_name || 'إدارة المنصة',
        vendor_account: vendorAcc,
        category_name: cat?.name || 'باقة إنترنت',
        card_code: decrypted,
        encrypted_code: rawEncrypted,
        is_code_encrypted: true, // Pending operations display encrypted
        gross_amount: gross,
        platform_commission: comm,
        gateway_fee: gwFee,
        vendor_net: gross - comm,
        platform_net: comm - gwFee,
        status_code: String(statusCode),
        error_symbol: String(errSymbol),
        gateway_response: gwResponse,
        status: p.status === 'reconciliation_required' ? 'reconciliation_required' : 'pending',
        raw_payload: p.metadata || {},
      });
    });

    // 2. Reserved cards that haven't been completed yet
    cards.filter(c => c && c.status === 'reserved' && !items.some(i => i.id === c.reserved_for_payment_id)).forEach((card: any) => {
      const net = networks.find(n => n.id === card.network_id);
      const vendor = net ? vendors.find(v => v.id === net.vendor_id) : null;
      const cat = categories.find(c => c.id === card.category_id);
      const cust = profiles.find(p => p.id === card.owner_id || p.id === card.reserved_by);

      const vWallet = wallets.find(w => w.user_id === vendor?.id);
      const vProfile = profiles.find(pr => pr.id === vendor?.id);
      const vendorAcc = vWallet?.wallet_number || 
        vProfile?.phone || 
        vendor?.user_phone || 
        (vendor?.id ? `ACC-${vendor.id.substring(0, 8).toUpperCase()}` : '770000000');

      const rawEncrypted = card.encrypted_code || card.code || `B7arJ6tp-${String(card.id).substring(0, 8)}`;
      const decrypted = decryptCardCode(rawEncrypted) || card.code || rawEncrypted;

      const gross = Number(card.price || cat?.price || 100);
      const comm = Math.round(gross * 0.05);
      const basConfig = walletsConfig.find(w => w.provider === 'basgate');
      const feePercent = basConfig?.fee_percentage !== undefined ? basConfig.fee_percentage : 1.5;
      const fixedFee = basConfig?.fixed_fee ?? 0;
      const gwFee = Math.round((gross * (feePercent / 100)) + fixedFee);
      const masterRef = resolveOperationNumber(card);

      items.push({
        id: card.id,
        payment_id: card.reserved_for_payment_id || card.id,
        platform_ref: masterRef,
        gateway_ref: card.ubtr_reference || `RES-${String(card.id).substring(0, 8).toUpperCase()}`,
        created_at: card.created_at || new Date().toISOString(),
        customer_name: cust?.name || 'مشترك قيد الدفع',
        customer_account: cust?.phone || (cust as any)?.phone_number || '780780525',
        network_name: net?.name || 'شبكة الواي فاي',
        vendor_name: vendor?.business_name || 'تاجر شبكة معتمد',
        vendor_account: vendorAcc,
        category_name: cat?.name || card.category_name || 'كرت محجوز',
        card_code: decrypted,
        encrypted_code: rawEncrypted,
        is_code_encrypted: true,
        gross_amount: gross,
        platform_commission: comm,
        gateway_fee: gwFee,
        vendor_net: gross - comm,
        platform_net: comm - gwFee,
        status_code: '1001',
        error_symbol: 'CARD_RESERVED_WAITING_WEBHOOK',
        gateway_response: 'الكرت محجوز ذرياً بانتظار تأكيد الاستجابة من بوابة الدفع',
        status: 'pending',
        raw_payload: { reserved_until: card.reserved_until },
      });
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [payments, cards, paymentItems, networks, vendors, categories, profiles, wallets, walletsConfig]);

  const filteredPending = useMemo(() => {
    return pendingData.filter(item => {
      if (!searchTerm) return true;
      return (
        item.platform_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.gateway_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer_name.includes(searchTerm) ||
        item.customer_account.includes(searchTerm) ||
        item.network_name.includes(searchTerm) ||
        item.vendor_name.includes(searchTerm) ||
        item.vendor_account.includes(searchTerm) ||
        item.encrypted_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.gateway_response.includes(searchTerm)
      );
    });
  }, [pendingData, searchTerm]);

  // Execute / Force Deliver
  const handleApproveExecute = async () => {
    if (!selectedOp) return;
    setProcessingAction(true);
    setFeedbackMessage(null);

    const res = await adminForceDeliverCards(selectedOp.payment_id, actionReason || 'معالجة وتنفيذ إداري فوري من غرفة العمليات');
    setProcessingAction(false);

    if (res.success) {
      // Upon successful delivery, uncover the decrypted code
      const decrypted = decryptCardCode(selectedOp.encrypted_code) || selectedOp.card_code;
      setSelectedOp(prev => prev ? {
        ...prev,
        is_code_encrypted: false,
        card_code: decrypted,
        status: 'pending', // Will be re-fetched from DB
      } : null);

      setFeedbackMessage({
        type: 'success',
        text: 'تم تسليم الكرت وتأكيد العملية بنجاح. تم فك تشفير الكرت وإشعار العميل والتاجر.'
      });
      await refetchFromDb();
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'فشل تنفيذ العملية. تأكد من توفر كروت في المخزون'
      });
    }
  };

  // Cancel Pending Operation (Without Depositing Funds)
  const handleRejectRefund = async () => {
    if (!selectedOp) return;
    setProcessingAction(true);
    setFeedbackMessage(null);

    const res = await adminRefundPayment(selectedOp.payment_id, actionReason || 'إلغاء إداري لمعاملة معلقة لم تُنفذ وتحرير الكروت المحجوزة');
    setProcessingAction(false);

    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: 'تم إلغاء المعاملة المعلقة وتحرير حجز الكرت ذرياً بنجاح (دون إيداع رصيد لعدم تنفيذ المعاملة أصلاً).'
      });
      await refetchFromDb();
      setTimeout(() => setSelectedOp(null), 2200);
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'فشل إلغاء المعاملة'
      });
    }
  };

  // Live S2S Gateway Status Query
  const handleQueryLiveStatus = async () => {
    if (!selectedOp) return;
    setIsQueryingStatus(true);
    setFeedbackMessage(null);

    const res = await adminQueryPaymentStatus(selectedOp.payment_id);
    setIsQueryingStatus(false);

    if (res.success && res.data) {
      const data = res.data;
      const raw = data.raw_response || data;

      const statusCode = data.payment_status_code ? String(data.payment_status_code) : (data.status === 'completed' ? '1202' : selectedOp.status_code);
      const errSymbol = data.error_symbol || (data.status === 'completed' ? 'SUCCESS' : (data.status === 'failed' ? 'PAYMENT_FAILED' : 'PENDING_IN_PROGRESS'));
      const msg = data.message || (data.status === 'completed' ? 'تم تأكيد الدفع بنجاح من خادم البنك' : 'لا تزال العملية قيد المعالجة لدى البنك');

      setSelectedOp(prev => prev ? {
        ...prev,
        status_code: statusCode,
        error_symbol: errSymbol,
        gateway_response: msg,
        raw_payload: raw,
      } : null);

      setFeedbackMessage({
        type: 'success',
        text: `تم استعلام البنك بنجاح وتحديث السجل في قاعدة البيانات. (كود الحالة: ${statusCode} | الرمز: ${errSymbol})`
      });
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'فشل الاتصال بخادم بوابة الدفع للاستعلام'
      });
    }
  };

  const columns: Column<PendingOperationItem>[] = [
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
          return (
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-300 dir-ltr bg-emerald-950/70 px-2 py-1 rounded-lg border border-emerald-700/60 shadow-sm" title={`كود الكرت الفعلي: ${row.card_code}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{row.card_code}</span>
            </div>
          );
        } else {
          return (
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-amber-300 dir-ltr bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-800/60 max-w-[140px] shadow-sm" title={`الكرت مشفر بالحالة المعلقة: ${row.encrypted_code}`}>
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
          -{row.gateway_fee.toLocaleString()} YER
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
          <span className="text-xs text-slate-200 font-medium line-clamp-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
            {row.gateway_response}
          </span>
        </div>
      ),
    },
    {
      header: 'حالة العملية',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'الإجراء',
      accessor: (row) => (
        <button
          onClick={() => {
            setSelectedOp(row);
            setActionReason('');
            setFeedbackMessage(null);
          }}
          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-950/50"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>معالجة</span>
        </button>
      ),
    },
  ];

  const handleExportCsv = () => {
    const exportRows = filteredPending.map(item => ({
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
      'رقم الكرت': item.encrypted_code,
      'حالة تشفير الكرت': 'مشفر (عملية معلقة)',
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
    exportToCsv('Admin_Pending_Operations_Report', exportRows);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-900/50 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              تقرير العمليات المعلقة وغرفة المعالجة والبت (Pending Operations Engine)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            متابعة العمليات العالقة بين بوابة الدفع والمنصة، مع إمكانية التنفيذ اليدوي الفوري أو الإلغاء والاسترداد.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel / CSV</span>
          </button>
          <button
            onClick={() => exportToPrint('تقرير العمليات المعلقة للأدمن', 'admin-pending-operations-table')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* KPI Info Alert */}
      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="text-xs text-slate-200">
            يوجد حالياً <span className="font-bold text-amber-400 font-mono text-sm">{filteredPending.length}</span> عملية معلقة تحتاج إلى متابعة إدارية أو استجابة من مزود الدفع.
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالمرجع الموحد، مرجع البوابة، العميل، الحساب، التاجر، كود الكرت المشفر..."
            className="w-full pr-9 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div id="admin-pending-operations-table">
        <DataTable
          data={filteredPending}
          columns={columns}
          title={`قائمة العمليات المعلقة (${filteredPending.length} عملية)`}
          searchPlaceholder="بحث سريع في العمليات المعلقة..."
          exportFilename="admin_pending_operations_report"
        />
      </div>

      {/* ACTION PROCESSING MODAL */}
      {selectedOp && (
        <Modal
          title={`غرفة معالجة العملية المعلقة (#${selectedOp.platform_ref})`}
          isOpen={true}
          onClose={() => {
            if (!processingAction) {
              setSelectedOp(null);
              setFeedbackMessage(null);
            }
          }}
        >
          <div className="space-y-4 text-xs dir-rtl">
            {/* Feedback Alert */}
            {feedbackMessage && (
              <div className={`p-3 rounded-xl flex items-center gap-2 font-bold ${
                feedbackMessage.type === 'success' 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span>{feedbackMessage.text}</span>
              </div>
            )}

            {/* Financial & Party Details */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">رقم مرجع العملية الموحد:</span>
                <span className="font-mono font-bold text-blue-400 dir-ltr">{selectedOp.platform_ref}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">مرجع بوابة الدفع / المزود:</span>
                <span className="font-mono font-bold text-amber-400 dir-ltr">{selectedOp.gateway_ref}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">العميل ورقم حسابه:</span>
                <span className="font-bold text-white">{selectedOp.customer_name} ({selectedOp.customer_account})</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">الشبكة والتاجر:</span>
                <span className="font-bold text-white">{selectedOp.network_name} | {selectedOp.vendor_name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">حساب صاحب الشبكة:</span>
                <span className="font-mono font-bold text-emerald-400 dir-ltr">{selectedOp.vendor_account}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">فئة الكرت:</span>
                <span className="font-bold text-white">{selectedOp.category_name}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-400">رقم الكرت:</span>
                <span className="font-mono font-bold text-xs dir-ltr flex items-center gap-1.5">
                  {!selectedOp.is_code_encrypted ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{selectedOp.card_code}</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{selectedOp.encrypted_code}</span>
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">المبلغ الإجمالي:</span>
                <span className="font-mono font-bold text-white text-xs">{selectedOp.gross_amount.toLocaleString()} YER</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">عمولة المنصة:</span>
                <span className="font-mono font-bold text-purple-400 text-xs">+{selectedOp.platform_commission.toLocaleString()} YER</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">صافي التاجر:</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">{selectedOp.vendor_net.toLocaleString()} YER</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">صافي المنصة:</span>
                <span className="font-mono font-bold text-cyan-400 text-xs">+{selectedOp.platform_net.toLocaleString()} YER</span>
              </div>
            </div>

            {/* Gateway Live Status Box with Status Code & Error Symbol */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <MessageSquare className="w-4 h-4" />
                  <span>استجابة بوابة الدفع (Gateway Status & Error):</span>
                </div>

                {/* S2S LIVE QUERY BUTTON */}
                <button
                  type="button"
                  disabled={isQueryingStatus}
                  onClick={handleQueryLiveStatus}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-950/40 disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isQueryingStatus ? 'animate-spin' : ''}`} />
                  <span>{isQueryingStatus ? 'جاري الاستعلام من البنك...' : 'استعلام عن حالة العملية لدى البنك'}</span>
                </button>
              </div>

              {/* Codes Row: Status Code + Error Symbol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">كود الحالة الرقمي (Status Code):</span>
                  <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 dir-ltr">
                    {selectedOp.status_code}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[11px]">رمز الخطأ (Error Symbol):</span>
                  <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 dir-ltr">
                    {selectedOp.error_symbol}
                  </span>
                </div>
              </div>

              {/* Textual Message */}
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px]">نص الاستجابة الحالي:</span>
                <p className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs leading-relaxed font-medium">
                  {selectedOp.gateway_response}
                </p>
              </div>
            </div>

            {/* Raw JSON Payload (Toggle / Inspect) */}
            {selectedOp.raw_payload && Object.keys(selectedOp.raw_payload).length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block mb-1 font-bold text-[10px]">البيانات الخام المخزنة في قاعدة البيانات (Raw Metadata):</span>
                <pre className="p-2 rounded bg-black/50 text-slate-300 font-mono text-[10px] overflow-x-auto max-h-32 border border-slate-900 dir-ltr text-left">
                  {JSON.stringify(selectedOp.raw_payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Action Reason Input */}
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block">سبب الإجراء والملاحظة الإدارية (تُسجل في سجل التدقيق):</label>
              <textarea
                rows={2}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="أدخل سبب التنفيذ أو سبب الإلغاء والاسترداد..."
                className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={processingAction}
                onClick={handleApproveExecute}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{processingAction ? 'جاري التنفيذ...' : 'تنفيذ فوري وتسليم الكرت'}</span>
              </button>

              <button
                type="button"
                disabled={processingAction}
                onClick={handleRejectRefund}
                className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>{processingAction ? 'جاري الإلغاء وتحرير الكرت...' : 'إلغاء المعاملة وتحرير الكرت'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
