/**
 * Vendor Account Statement Utilities.
 * Enforces canonical double-entry accounting reconciliation for vendor statements.
 * Derives statement records strictly from authentic wallet transactions.
 */

import { formatMasterTransactionId } from './ledgerUtils';

export interface RawTransactionInput {
  id: string;
  wallet_id?: string;
  amount: number | string;
  type: string;
  status?: string;
  description?: string | null;
  reference_id?: string | null;
  created_at?: string;
  payment_method?: string | null;
  external_wallet_name?: string | null;
  transaction_reference?: string | null;
}

export interface RawWithdrawalRequestInput {
  id: string;
  amount: number | string;
  status: string;
  created_at: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  reject_reason?: string;
}

export interface StatementItem {
  id: string;
  date: string;
  ref_no: string;
  description: string;
  type: 'credit' | 'debit';
  debit: number;
  credit: number;
  status: 'completed' | 'pending' | 'failed';
  currency: string;
}

export interface StatementRow extends StatementItem {
  running_balance: number;
}

export interface StatementSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  closingBalance: number;
}

/**
 * Safely parses any amount value into a finite number.
 */
export function normalizeTransactionAmount(amount: unknown): number {
  if (typeof amount === 'number') {
    return Number.isFinite(amount) ? amount : 0;
  }
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Normalizes transaction lifecycle status.
 */
export function normalizeTransactionStatus(status: unknown): 'completed' | 'pending' | 'failed' {
  if (!status) return 'completed';
  const clean = String(status).trim().toLowerCase();
  if (clean === 'completed' || clean === 'approved' || clean === 'success') return 'completed';
  if (clean === 'pending' || clean === 'processing' || clean === 'review') return 'pending';
  if (clean === 'failed' || clean === 'rejected' || clean === 'cancelled' || clean === 'reversed') return 'failed';
  return 'completed';
}

/**
 * Builds chronological statement items from authentic transactions and deduplicated withdrawal requests.
 */
export function buildStatementItems(
  transactions: RawTransactionInput[] = [],
  withdrawalRequests: RawWithdrawalRequestInput[] = []
): StatementItem[] {
  const items: StatementItem[] = [];
  const processedWithdrawalIds = new Set<string>();

  // 1. Process authentic wallet transactions
  for (const tx of transactions) {
    const rawAmount = normalizeTransactionAmount(tx.amount);
    const status = normalizeTransactionStatus(tx.status);
    const isCredit = rawAmount >= 0;
    const absAmount = Math.abs(rawAmount);

    const debit = isCredit ? 0 : absAmount;
    const credit = isCredit ? absAmount : 0;

    // Track withdrawal references to prevent double-counting
    if (tx.reference_id) {
      processedWithdrawalIds.add(String(tx.reference_id).toLowerCase());
    }

    // Format reference number
    let refNo = tx.transaction_reference || '';
    if (!refNo && tx.reference_id) {
      refNo = formatMasterTransactionId(tx.reference_id);
    }
    if (!refNo && tx.id) {
      refNo = formatMasterTransactionId(tx.id);
    }

    // Format descriptive text
    let description = (tx.description || '').trim();
    if (!description) {
      if (tx.type === 'commission') {
        description = 'مستحقات مبيعات كروت شبكة';
      } else if (tx.type === 'withdrawal') {
        description = 'سحب أرباح من المحفظة';
      } else if (tx.type === 'recharge') {
        description = 'إيداع رصيد بالمحفظة';
      } else if (tx.type === 'refund') {
        description = 'استرداد مالي';
      } else {
        description = isCredit ? 'حركة دائنة بالمحفظة' : 'حركة مدينة بالمحفظة';
      }
    }

    items.push({
      id: tx.id,
      date: tx.created_at || new Date().toISOString(),
      ref_no: refNo,
      description,
      type: isCredit ? 'credit' : 'debit',
      debit,
      credit,
      status,
      currency: 'YER',
    });
  }

  // 2. Append non-duplicated pending or rejected withdrawal requests for informational visibility
  for (const wr of withdrawalRequests) {
    const wrId = String(wr.id).toLowerCase();
    const st = String(wr.status).trim().toLowerCase();

    // Skip if already settled in transactions as an approved/completed debit
    if (processedWithdrawalIds.has(wrId) || st === 'approved') {
      continue;
    }

    const amt = Math.abs(normalizeTransactionAmount(wr.amount));
    const isRejected = st === 'rejected';

    let desc = isRejected
      ? `طلب سحب مرفوض: ${wr.bank_name || 'محفظة بنكية'} (${wr.reject_reason || 'غير محدد'})`
      : `طلب سحب قيد المراجعة: ${wr.bank_name || 'محفظة بنكية'} (${wr.account_number || ''})`;

    items.push({
      id: `wr-${wr.id}`,
      date: wr.created_at || new Date().toISOString(),
      ref_no: formatMasterTransactionId(wr.id),
      description: desc.trim(),
      type: 'debit',
      debit: amt,
      credit: 0,
      status: isRejected ? 'failed' : 'pending',
      currency: 'YER',
    });
  }

  // Sort ascending by chronological timestamp for running balance calculation
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return items;
}

/**
 * Calculates cumulative running balance across chronological statement items.
 * Non-completed (pending/failed) items do NOT alter the ledger running balance.
 */
export function calculateRunningBalances(items: StatementItem[]): StatementRow[] {
  let currentBalance = 0;
  return items.map((item) => {
    if (item.status === 'completed') {
      currentBalance = item.type === 'credit'
        ? currentBalance + item.credit
        : currentBalance - item.debit;
    }
    return {
      ...item,
      running_balance: currentBalance,
    };
  });
}

/**
 * Filters statement entries and calculates canonical accounting summary.
 */
export function filterStatementRows(
  rows: StatementRow[],
  options: {
    searchTerm?: string;
    filterType?: 'all' | 'credit' | 'debit';
    startDate?: string;
    endDate?: string;
  } = {}
): { filtered: StatementRow[]; summary: StatementSummary } {
  const { searchTerm = '', filterType = 'all', startDate = '', endDate = '' } = options;

  const startTimestamp = startDate ? new Date(startDate).getTime() : null;
  const endTimestamp = endDate ? new Date(endDate + 'T23:59:59.999Z').getTime() : null;
  const term = searchTerm.trim().toLowerCase();

  // 1. Calculate opening balance for items completed strictly prior to startDate
  let openingBalance = 0;
  if (startTimestamp !== null) {
    for (const row of rows) {
      const itemTime = new Date(row.date).getTime();
      if (itemTime < startTimestamp && row.status === 'completed') {
        openingBalance += (row.type === 'credit' ? row.credit : -row.debit);
      }
    }
  }

  // 2. Filter items within requested scope
  const filtered = rows.filter((item) => {
    const itemTime = new Date(item.date).getTime();

    if (startTimestamp !== null && itemTime < startTimestamp) {
      return false;
    }
    if (endTimestamp !== null && itemTime > endTimestamp) {
      return false;
    }

    if (filterType !== 'all' && item.type !== filterType) {
      return false;
    }

    if (term) {
      const matchesRef = item.ref_no.toLowerCase().includes(term);
      const matchesDesc = item.description.toLowerCase().includes(term);
      if (!matchesRef && !matchesDesc) {
        return false;
      }
    }

    return true;
  });

  // 3. Calculate summary metrics over completed entries in scope
  let totalDebit = 0;
  let totalCredit = 0;

  for (const item of filtered) {
    if (item.status === 'completed') {
      if (item.type === 'credit') {
        totalCredit += item.credit;
      } else {
        totalDebit += item.debit;
      }
    }
  }

  const netMovement = totalCredit - totalDebit;
  const closingBalance = openingBalance + netMovement;

  return {
    filtered,
    summary: {
      openingBalance,
      totalDebit,
      totalCredit,
      netMovement,
      closingBalance,
    },
  };
}
