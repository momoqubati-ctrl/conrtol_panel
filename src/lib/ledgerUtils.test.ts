/**
 * Central Contract Test for Unified Business Transaction Reference (UBTR) Resolution.
 * Enforces identical commercial references across Admin Portal, Vendor Portal, Customer Receipt, and Ledger.
 */

import {
  resolveUnifiedCardTransaction,
  resolveOperationNumber,
  formatMasterTransactionId,
} from './ledgerUtils.ts';
import type { UnifiedTransactionContext } from './ledgerUtils.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ CONTRACT ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Starting UBTR Canonical Contract Tests ---');

// Mock Data
const paymentId = '0383cddd-38b4-4748-9598-80ac615c81ab';
const pendingPaymentId = 'db28586c-38b4-4748-9598-80ac615c81ab';
const paymentItemId = 'pi-item-1111-2222-3333-444455556666';
const multiPaymentItemId = 'pi-item-multi-cart-0001';

const mockPayments = [
  {
    id: paymentId,
    provider: 'basgate',
    provider_reference: 'BAS_1789664383489_645',
    status: 'completed',
    amount: 100,
  },
  {
    id: pendingPaymentId,
    provider: 'basgate',
    provider_reference: 'BAS_1789510466873_77',
    status: 'pending',
    amount: 100,
  },
];

const mockPaymentItems = [
  {
    id: paymentItemId,
    payment_id: paymentId,
    category_id: 'cat-100',
    quantity: 1,
  },
  {
    id: multiPaymentItemId,
    payment_id: paymentId,
    category_id: 'cat-100',
    quantity: 2,
  },
];

const mockDeliveryAttempts = [
  {
    card_id: 'wallet-card-9999',
    ubtr_id: 'UBTR-20260917001',
    status: 'DELIVERED',
  },
];

const context: UnifiedTransactionContext = {
  payments: mockPayments,
  paymentItems: mockPaymentItems,
  deliveryAttempts: mockDeliveryAttempts,
};

// Scenario 1: BasGate completed
const cardBasGateCompleted = {
  id: 'e0da9d8f-1111-2222-3333-444455556666',
  code: '1234946461',
  status: 'sold',
  payment_item_id: paymentItemId,
  reserved_for_payment_id: null, // cleared
};
const res1 = resolveUnifiedCardTransaction(cardBasGateCompleted, context);
assert(res1.ubtr === 'TX-0383CDDD', 'Scenario 1: BasGate completed must resolve to payment UBTR TX-0383CDDD');
assert(res1.payment_method === 'بوابة BasGate', 'Scenario 1: Payment method must be بوابة BasGate');
assert(!res1.is_fallback, 'Scenario 1: Must NOT be fallback');

// Scenario 2: BasGate after reserved_for_payment_id becomes NULL
const cardBasGateCleared = {
  id: 'e0da9d8f-1111-2222-3333-444455556666',
  code: '1234946461',
  status: 'sold',
  payment_item_id: paymentItemId,
  reserved_for_payment_id: null,
};
const res2 = resolveUnifiedCardTransaction(cardBasGateCleared, context);
assert(res2.ubtr === res1.ubtr, 'Scenario 2: Post-settlement card must yield identical UBTR to pre-settlement');
assert(res2.payment_method === 'بوابة BasGate', 'Scenario 2: Must recognize BasGate channel even when reserved_for_payment_id is null');

// Scenario 3: Wallet Purchase via Saga
const cardWallet = {
  id: 'wallet-card-9999',
  code: '9988776655',
  status: 'sold',
};
const res3 = resolveUnifiedCardTransaction(cardWallet, context);
assert(res3.ubtr === 'UBTR-20260917001', 'Scenario 3: Wallet purchase must resolve to canonical UBTR from delivery attempt');
assert(res3.payment_method === 'محفظة التطبيق', 'Scenario 3: Channel must be محفظة التطبيق');
assert(!res3.is_fallback, 'Scenario 3: Wallet UBTR must NOT be flagged as fallback');

// Scenario 4: Pending Payment
const cardPending = {
  id: 'pending-card-7777',
  code: 'B7arJ6tp-db28586c',
  status: 'reserved',
  reserved_for_payment_id: pendingPaymentId,
};
const res4 = resolveUnifiedCardTransaction(cardPending, context);
assert(res4.ubtr === 'TX-DB28586C', 'Scenario 4: Pending reservation must resolve to TX-DB28586C');
assert(res4.payment_method === 'بوابة BasGate', 'Scenario 4: Channel must be بوابة BasGate');

// Scenario 5: Multi-card in single payment
const cardCart1 = { id: 'cart-card-1', payment_item_id: multiPaymentItemId, status: 'sold' };
const cardCart2 = { id: 'cart-card-2', payment_item_id: multiPaymentItemId, status: 'sold' };
const res5a = resolveUnifiedCardTransaction(cardCart1, context);
const res5b = resolveUnifiedCardTransaction(cardCart2, context);
assert(res5a.ubtr === res5b.ubtr && res5a.ubtr === 'TX-0383CDDD', 'Scenario 5: Multi-card in same cart must share exact same UBTR');

// Scenario 6: Card without linked payment (Fallback)
const standaloneCard = {
  id: 'fe123456-9999-0000-aaaa-bbbbccccdddd',
  code: '4455667788',
  status: 'sold',
};
const res6 = resolveUnifiedCardTransaction(standaloneCard, context);
assert(res6.ubtr === 'TX-FE123456', 'Scenario 6: Standalone card must format card.id');
assert(res6.is_fallback === true, 'Scenario 6: Standalone card must be flagged with is_fallback = true');
assert(res6.payment_method === 'غير محدد', 'Scenario 6: Standalone fallback card payment method must be غير محدد');

// Scenario 7: Idempotency / reload stability
const reload1 = resolveUnifiedCardTransaction(cardBasGateCompleted, context);
const reload2 = resolveUnifiedCardTransaction(cardBasGateCompleted, context);
assert(reload1.ubtr === reload2.ubtr, 'Scenario 7: Successive calls must be 100% idempotent');

// Scenario 8: Cross-entity alignment (Admin vs Vendor vs Customer vs Ledger)
const adminResolved = resolveOperationNumber(mockPayments[0]);
const vendorResolved = resolveUnifiedCardTransaction(cardBasGateCompleted, context).ubtr;
const customerReceiptRef = formatMasterTransactionId(mockPayments[0].id);
assert(
  adminResolved === vendorResolved && vendorResolved === customerReceiptRef,
  `Scenario 8: Admin (${adminResolved}), Vendor (${vendorResolved}), and Customer Receipt (${customerReceiptRef}) MUST BE IDENTICAL`
);

console.log('--- All 8 Canonical Contract Tests PASSED Successfully! ---');
