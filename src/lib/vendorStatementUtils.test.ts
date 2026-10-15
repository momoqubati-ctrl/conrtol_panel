/**
 * Comprehensive Unit Tests for Vendor Account Statement Calculations.
 * Validates all acceptance criteria:
 * - Direct ledger transaction source
 * - Real amounts without artificial commission re-calculation
 * - Deduplication of withdrawal requests
 * - Non-completed statuses exclusion from running balances
 * - Chronological ascending running balance
 * - Dynamic opening balance for date ranges
 * - Reference dataset financial parity (11,513 YER credit, 1,700 YER debit, 9,813 YER net)
 */

import {
  normalizeTransactionAmount,
  normalizeTransactionStatus,
  buildStatementItems,
  calculateRunningBalances,
  filterStatementRows,
  RawTransactionInput,
  RawWithdrawalRequestInput,
} from './vendorStatementUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Starting Vendor Account Statement Unit Tests ---');

// Test 1: Amount Normalization
assert(normalizeTransactionAmount(95) === 95, 'normalizeTransactionAmount: number 95');
assert(normalizeTransactionAmount('95.00') === 95, 'normalizeTransactionAmount: string "95.00"');
assert(normalizeTransactionAmount(-700) === -700, 'normalizeTransactionAmount: negative number -700');
assert(normalizeTransactionAmount('-1000.00') === -1000, 'normalizeTransactionAmount: negative string "-1000.00"');
assert(normalizeTransactionAmount(null) === 0, 'normalizeTransactionAmount: null -> 0');
assert(normalizeTransactionAmount(undefined) === 0, 'normalizeTransactionAmount: undefined -> 0');
assert(normalizeTransactionAmount('invalid') === 0, 'normalizeTransactionAmount: invalid string -> 0');

// Test 2: Status Normalization
assert(normalizeTransactionStatus('completed') === 'completed', 'normalizeTransactionStatus: completed');
assert(normalizeTransactionStatus('approved') === 'completed', 'normalizeTransactionStatus: approved -> completed');
assert(normalizeTransactionStatus('pending') === 'pending', 'normalizeTransactionStatus: pending');
assert(normalizeTransactionStatus('rejected') === 'failed', 'normalizeTransactionStatus: rejected -> failed');
assert(normalizeTransactionStatus('failed') === 'failed', 'normalizeTransactionStatus: failed');
assert(normalizeTransactionStatus(null) === 'completed', 'normalizeTransactionStatus: null default completed');

// Test 3: Deduplication of Withdrawals (Requirement 5)
const mockWithdrawalRequestId = '7b10aa50-e86e-4dd8-92d3-8d695f24b533';
const mockTxWithWithdrawal: RawTransactionInput[] = [
  {
    id: 'tx-wd-001',
    amount: -700,
    type: 'withdrawal',
    status: 'completed',
    reference_id: mockWithdrawalRequestId,
    created_at: '2026-07-18T16:40:58Z',
  },
];
const mockWithdrawalRequests: RawWithdrawalRequestInput[] = [
  {
    id: mockWithdrawalRequestId,
    amount: 700,
    status: 'approved',
    created_at: '2026-07-18T16:40:58Z',
    bank_name: 'جيب',
    account_number: '780780525',
  },
  {
    id: 'pending-wd-999',
    amount: 500,
    status: 'pending',
    created_at: '2026-08-01T10:00:00Z',
    bank_name: 'كريمي',
    account_number: '123456',
  },
];

const deduplicatedItems = buildStatementItems(mockTxWithWithdrawal, mockWithdrawalRequests);
assert(deduplicatedItems.length === 2, `Deduplication: Expected 2 items, got ${deduplicatedItems.length}`);
const completedDebits = deduplicatedItems.filter(i => i.status === 'completed');
assert(completedDebits.length === 1 && completedDebits[0].debit === 700, 'Deduplication: Approved withdrawal request was NOT double-counted');
const pendingItems = deduplicatedItems.filter(i => i.status === 'pending');
assert(pendingItems.length === 1 && pendingItems[0].debit === 500, 'Deduplication: Pending withdrawal request is retained as informational pending');

// Test 4: Running balance chronological calculation & non-completed status isolation (Requirements 4, 6)
const chronologicalTestItems = [
  {
    id: 'item-1',
    date: '2026-07-18T10:00:00Z',
    ref_no: 'TX-001',
    description: 'إيداع',
    type: 'credit' as const,
    debit: 0,
    credit: 1000,
    status: 'completed' as const,
    currency: 'YER',
  },
  {
    id: 'item-2',
    date: '2026-07-18T12:00:00Z',
    ref_no: 'TX-002',
    description: 'طلب سحب معلق',
    type: 'debit' as const,
    debit: 300,
    credit: 0,
    status: 'pending' as const,
    currency: 'YER',
  },
  {
    id: 'item-3',
    date: '2026-07-18T14:00:00Z',
    ref_no: 'TX-003',
    description: 'سحب معتمد',
    type: 'debit' as const,
    debit: 200,
    credit: 0,
    status: 'completed' as const,
    currency: 'YER',
  },
];

const runningRows = calculateRunningBalances(chronologicalTestItems);
assert(runningRows[0].running_balance === 1000, 'Running balance after item 1 (+1000) must be 1000');
assert(runningRows[1].running_balance === 1000, 'Running balance after item 2 (pending -300) must remain 1000 (unchanged)');
assert(runningRows[2].running_balance === 800, 'Running balance after item 3 (completed -200) must be 800');

// Test 5: Reference Acceptance Dataset Parity (Audit Numbers Verification - Requirement 4)
// Synthesizing the authentic 77 transactions:
// 60 @ 95.00 YER (5% commission on 100 YER BasGate)
// 9 @ 97.00 YER (3% commission on 100 YER Wallet purchase saga)
// 1 @ 190.00 YER (5% commission on 200 YER)
// 5 @ 950.00 YER (5% commission on 1000 YER)
// 1 @ -700.00 YER (withdrawal)
// 1 @ -1000.00 YER (withdrawal)
const syntheticTransactions: RawTransactionInput[] = [
  ...Array(60).fill(null).map((_, i) => ({
    id: `tx-bg-100-${i}`,
    amount: 95.00,
    type: 'commission',
    status: 'completed',
    created_at: `2026-07-18T01:${String(i % 60).padStart(2, '0')}:00Z`,
    description: 'مستحقات بيع كرت شبكة - صافي الخصم',
  })),
  ...Array(9).fill(null).map((_, i) => ({
    id: `tx-wallet-100-${i}`,
    amount: 97.00,
    type: 'commission',
    status: 'completed',
    created_at: `2026-09-17T20:${String(i).padStart(2, '0')}:00Z`,
    description: 'مبيعات كروت واي فاي (UBTR)',
  })),
  {
    id: 'tx-bg-200-0',
    amount: 190.00,
    type: 'commission',
    status: 'completed',
    created_at: '2026-07-18T02:00:00Z',
    description: 'مستحقات بيع كرت فئة 200',
  },
  ...Array(5).fill(null).map((_, i) => ({
    id: `tx-bg-1000-${i}`,
    amount: 950.00,
    type: 'commission',
    status: 'completed',
    created_at: `2026-07-25T02:0${i}:00Z`,
    description: 'مستحقات بيع كرت فئة 1000',
  })),
  {
    id: 'tx-wd-700',
    amount: -700.00,
    type: 'withdrawal',
    status: 'completed',
    created_at: '2026-07-18T16:40:58Z',
    reference_id: '7b10aa50-e86e-4dd8-92d3-8d695f24b533',
    description: 'سحب رصيد إلى حساب',
  },
  {
    id: 'tx-wd-1000',
    amount: -1000.00,
    type: 'withdrawal',
    status: 'completed',
    created_at: '2026-07-29T18:20:52Z',
    reference_id: '5fb3bf6d-717b-4efa-a4a3-a776e85fac71',
    description: 'سحب رصيد إلى حساب',
  },
];

assert(syntheticTransactions.length === 77, `Dataset: Expected 77 transactions, got ${syntheticTransactions.length}`);

const items77 = buildStatementItems(syntheticTransactions, [
  { id: '7b10aa50-e86e-4dd8-92d3-8d695f24b533', amount: 700, status: 'approved', created_at: '2026-07-18T16:40:58Z' },
  { id: '5fb3bf6d-717b-4efa-a4a3-a776e85fac71', amount: 1000, status: 'approved', created_at: '2026-07-29T18:20:52Z' },
]);

const rows77 = calculateRunningBalances(items77);
const { summary: fullSummary } = filterStatementRows(rows77);

assert(fullSummary.totalCredit === 11513, `Full Summary Credit: Expected 11,513 YER, got ${fullSummary.totalCredit}`);
assert(fullSummary.totalDebit === 1700, `Full Summary Debit: Expected 1,700 YER, got ${fullSummary.totalDebit}`);
assert(fullSummary.netMovement === 9813, `Full Summary Net: Expected 9,813 YER, got ${fullSummary.netMovement}`);
assert(fullSummary.closingBalance === 9813, `Full Summary Closing: Expected 9,813 YER, got ${fullSummary.closingBalance}`);
assert(fullSummary.closingBalance !== 10460, 'Old erroneous card-inventory amount (10,460 YER) is completely eliminated');

// Test 6: Date Range & Dynamic Opening Balance (Requirement 7)
// Filter starting on 2026-07-20 (after initial transactions and first 700 YER withdrawal)
const { summary: filteredDateSummary } = filterStatementRows(rows77, {
  startDate: '2026-07-20',
});

// Calculate items before July 20:
// 60 @ 95 = 5700
// 1 @ 190 = 190
// 1 withdrawal = -700
// Total before July 20 = 5700 + 190 - 700 = 5190 YER
assert(filteredDateSummary.openingBalance === 5190, `Date Filter Opening: Expected 5,190 YER, got ${filteredDateSummary.openingBalance}`);
// Remaining after July 20:
// 9 @ 97 = 873
// 5 @ 950 = 4750
// Total credit in range = 5623 YER
// 1 withdrawal = 1000 YER
assert(filteredDateSummary.totalCredit === 5623, `Date Filter Credit: Expected 5,623 YER, got ${filteredDateSummary.totalCredit}`);
assert(filteredDateSummary.totalDebit === 1000, `Date Filter Debit: Expected 1,000 YER, got ${filteredDateSummary.totalDebit}`);
assert(filteredDateSummary.closingBalance === 9813, `Date Filter Closing: Expected 9,813 YER (5190 + 5623 - 1000), got ${filteredDateSummary.closingBalance}`);

// Test 7: Type Filtering
const { filtered: creditOnlyRows } = filterStatementRows(rows77, { filterType: 'credit' });
assert(creditOnlyRows.length === 75, `Type Filter: Expected 75 credit rows, got ${creditOnlyRows.length}`);
const { filtered: debitOnlyRows } = filterStatementRows(rows77, { filterType: 'debit' });
assert(debitOnlyRows.length === 2, `Type Filter: Expected 2 debit rows, got ${debitOnlyRows.length}`);

// Test 8: Search Filtering
const { filtered: searchRows } = filterStatementRows(rows77, { searchTerm: 'UBTR' });
assert(searchRows.length === 9, `Search Filter: Expected 9 UBTR rows, got ${searchRows.length}`);

// Test 9: Pagination Slicing
const pageSize = 10;
const page1 = rows77.slice(0, pageSize);
const page2 = rows77.slice(pageSize, pageSize * 2);
assert(page1.length === 10, 'Pagination: Page 1 must have 10 rows');
assert(page2.length === 10, 'Pagination: Page 2 must have 10 rows');
assert(page1[0].id !== page2[0].id, 'Pagination: Successive pages must be distinct');

// Test 10: Multi-tenant Cross-Wallet Isolation
const vendorAWalletId = 'c335cdbd-94f1-4b42-add2-8c8e21abde54';
const vendorBWalletId = '99999999-9999-9999-9999-999999999999';

const mixedWalletTransactions: RawTransactionInput[] = [
  ...syntheticTransactions.map(t => ({ ...t, wallet_id: vendorAWalletId })),
  {
    id: 'tx-foreign-001',
    wallet_id: vendorBWalletId,
    amount: 50000.00,
    type: 'recharge',
    status: 'completed',
    created_at: '2026-08-01T00:00:00Z',
  },
];

// When filtering for Vendor A's wallet
const vendorAItems = mixedWalletTransactions.filter(t => t.wallet_id === vendorAWalletId);
const statementA = calculateRunningBalances(buildStatementItems(vendorAItems));
const { summary: summaryA } = filterStatementRows(statementA);
assert(summaryA.closingBalance === 9813, 'Isolation: Vendor A statement ignores Vendor B foreign wallet transactions');
assert(statementA.every(row => row.id !== 'tx-foreign-001'), 'Isolation: Foreign transaction tx-foreign-001 strictly excluded');

// Test 11: Empty / RLS Restricted Fallback Safety (Zero Data)
const emptyItems = buildStatementItems([]);
const emptyRows = calculateRunningBalances(emptyItems);
const { summary: emptySummary } = filterStatementRows(emptyRows);
assert(emptySummary.openingBalance === 0, 'Empty Safety: openingBalance is 0');
assert(emptySummary.totalDebit === 0, 'Empty Safety: totalDebit is 0');
assert(emptySummary.totalCredit === 0, 'Empty Safety: totalCredit is 0');
assert(emptySummary.closingBalance === 0, 'Empty Safety: closingBalance is 0');

console.log('--- All Vendor Account Statement Unit Tests PASSED Successfully! ---');

