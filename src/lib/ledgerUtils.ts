/**
 * Centralized Financial Ledger Utilities & Master Transaction ID Engine
 * Single Source of Truth for Master Transaction References across Admin Portal, Vendor Portal, and Flutter App.
 */

import { isCardSold } from './cardStatusUtils';

export interface MasterLedgerEntry {
  id: string;                      // Database Primary Key (UUID)
  master_tx_id: string;            // Unified Master Reference (e.g. TX-5FB3BF6D)
  sub_references: {
    order_id?: string;             // ORD-6564E615
    withdrawal_id?: string;        // WDR-5FB3BF6D
    bank_settlement_id?: string;   // BANK-773001
    basgate_ref?: string;          // BAS-89378291
    audit_id?: string;             // AUD-55611
    sms_id?: string;               // SMS-009321
  };
  type: 'purchase' | 'deposit' | 'withdrawal' | 'commission' | 'refund' | 'settlement' | 'transfer' | 'adjustment';
  title: string;
  description: string;
  source_channel: string;
  user_name: string;
  user_phone: string;
  vendor_name?: string;
  network_name?: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  running_balance: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'needs_reconciliation';
  created_at: string;
}

export interface UnifiedTransactionContext {
  payments?: any[];
  paymentItems?: any[];
  deliveryAttempts?: any[];
  orders?: any[];
  transactions?: any[];
}

export interface ResolvedCardFinancialDetails {
  financial_reference: string | null;
  is_financial_reference_available: boolean;
  card_serial: string;
  payment_method: string;
  gross_amount: number;
  commission_rate: number | null;
  platform_commission: number;
  net_amount: number;
  status: 'completed' | 'pending' | 'failed';
  is_fallback: boolean;
  source_entity: string;
  ubtr_reference?: string | null;
  provider_reference?: string | null;
}

export interface ResolvedCardTransaction {
  ubtr: string;                         // Canonical commercial reference (e.g. TX-0383CDDD or UBTR-12345)
  payment_method: string;                // e.g. 'بوابة BasGate' | 'محفظة التطبيق' | 'محفظة بيس' | 'بوابة دفع إلكترونية'
  is_fallback: boolean;                  // True ONLY when falling back to technical card.id
  source_entity: 'payment_item_card' | 'card_payment_item' | 'card_reservation' | 'delivery_attempt' | 'card_ubtr' | 'fallback_card';
  payment_id?: string;                   // Technical internal ID
  gateway_reference?: string;            // Gateway reference
}

/**
 * Resolve friendly provider / channel name from payment record
 */
export function resolvePaymentProviderName(payment: any): string {
  if (!payment) return 'محفظة التطبيق';
  const provider = String(payment.provider || '').toLowerCase().trim();
  if (provider === 'basgate') return 'بوابة BasGate';
  if (provider === 'pyes') return 'محفظة بيس';
  if (provider === 'kuraimi') return 'بنك الكريمي';
  if (provider === 'shabakati_wallet' || provider === 'wallet') return 'محفظة التطبيق';
  if (payment.payment_method && payment.payment_method !== 'wallet') {
    return payment.payment_method;
  }
  return payment.provider ? `بوابة ${payment.provider}` : 'بوابة دفع إلكترونية';
}

/**
 * Format raw UUID or ID into unified Master Transaction ID (TX-XXXXXXXX)
 */
export function formatMasterTransactionId(rawId: string): string {
  if (!rawId) return 'TX-00000000';
  if (/^UBTR-\d+$/i.test(rawId)) return rawId.toUpperCase();
  const clean = rawId.replace(/^(TX-|ORD-|WDR-|DEP-|SHB-PAY-|SHB-WDR-|SHB-DEP-|pay-dep-|pay-wd-|act-card-|act-wd-)/i, '');
  const hexPart = clean.substring(0, 8).toUpperCase();
  return `TX-${hexPart}`;
}

/**
 * Strict 6-Tier Canonical UBTR & Payment Method Resolver for sold / reserved cards.
 * Never creates new random UBTRs; extracts truth from authoritative records.
 */
export function resolveUnifiedCardTransaction(
  card: Record<string, any> | null | undefined,
  context: UnifiedTransactionContext = {}
): ResolvedCardTransaction {
  if (!card) {
    return {
      ubtr: 'TX-00000000',
      payment_method: 'محفظة التطبيق',
      is_fallback: true,
      source_entity: 'fallback_card',
    };
  }

  const { payments = [], paymentItems = [], deliveryAttempts = [] } = context;

  // Tier 1: payment_items.card_id → payment_items.payment_id → payments
  if (paymentItems.length > 0 && payments.length > 0) {
    const matchedPi = paymentItems.find((pi: any) => {
      if (!pi) return false;
      if (pi.card_id && pi.card_id === card.id) return true;
      if (Array.isArray(pi.card_ids) && pi.card_ids.includes(card.id)) return true;
      return false;
    });

    if (matchedPi?.payment_id) {
      const payment = payments.find((p: any) => p && p.id === matchedPi.payment_id);
      if (payment) {
        return {
          ubtr: resolveOperationNumber(payment),
          payment_method: resolvePaymentProviderName(payment),
          is_fallback: false,
          source_entity: 'payment_item_card',
          payment_id: payment.id,
          gateway_reference: payment.provider_reference,
        };
      }
    }
  }

  // Tier 2: card.payment_item_id → payment_items → payments
  if (card.payment_item_id && paymentItems.length > 0 && payments.length > 0) {
    const matchedPi = paymentItems.find((pi: any) => pi && pi.id === card.payment_item_id);
    if (matchedPi?.payment_id) {
      const payment = payments.find((p: any) => p && p.id === matchedPi.payment_id);
      if (payment) {
        return {
          ubtr: resolveOperationNumber(payment),
          payment_method: resolvePaymentProviderName(payment),
          is_fallback: false,
          source_entity: 'card_payment_item',
          payment_id: payment.id,
          gateway_reference: payment.provider_reference,
        };
      }
    }
  }

  // Tier 3: card.reserved_for_payment_id → payments (Temporary state only)
  if (card.reserved_for_payment_id && payments.length > 0) {
    const payment = payments.find((p: any) => p && p.id === card.reserved_for_payment_id);
    if (payment) {
      return {
        ubtr: resolveOperationNumber(payment),
        payment_method: resolvePaymentProviderName(payment),
        is_fallback: false,
        source_entity: 'card_reservation',
        payment_id: payment.id,
        gateway_reference: payment.provider_reference,
      };
    }
  }

  // Tier 4: card_delivery_attempts.card_id → ubtr_id (Wallet Saga Path)
  if (deliveryAttempts.length > 0) {
    const delivery = deliveryAttempts.find((d: any) => d && d.card_id === card.id);
    if (delivery?.ubtr_id) {
      return {
        ubtr: formatMasterTransactionId(delivery.ubtr_id),
        payment_method: 'محفظة التطبيق',
        is_fallback: false,
        source_entity: 'delivery_attempt',
        gateway_reference: delivery.ubtr_id,
      };
    }
  }

  // Tier 5: card.ubtr_reference / card.ubtr / card.ubtr_id directly
  const explicitUbtr = card.ubtr_reference || card.ubtr || card.ubtr_id;
  if (explicitUbtr) {
    return {
      ubtr: formatMasterTransactionId(explicitUbtr),
      payment_method: 'محفظة التطبيق',
      is_fallback: false,
      source_entity: 'card_ubtr',
      gateway_reference: explicitUbtr,
    };
  }

  // Tier 6: Fallback to card.id with explicit is_fallback = true
  // When payment details cannot be definitively proven, provide a neutral indicator
  return {
    ubtr: formatMasterTransactionId(card.id),
    payment_method: 'غير محدد',
    is_fallback: true,
    source_entity: 'fallback_card',
  };
}

/**
 * Resolves authentic financial details for a sold card without artificial guesswork.
 * Matches card to payment_items (BasGate), wallet transactions / orders (App Wallet).
 * When unlinked, clearly sets is_financial_reference_available = false instead of fabricating TX-<CARD_ID>.
 */
export function resolveCardFinancialDetails(
  card: Record<string, any> | null | undefined,
  context: UnifiedTransactionContext = {}
): ResolvedCardFinancialDetails {
  const cardSerial = card?.serial_number || (card?.id ? formatMasterTransactionId(card.id) : 'S/N-UNKNOWN');
  const cardPrice = Number(card?.price || 0);

  if (!card) {
    return {
      financial_reference: null,
      is_financial_reference_available: false,
      card_serial: 'S/N-UNKNOWN',
      payment_method: 'غير محدد',
      gross_amount: 0,
      commission_rate: null,
      platform_commission: 0,
      net_amount: 0,
      status: 'failed',
      is_fallback: true,
      source_entity: 'null_card',
    };
  }

  const { payments = [], paymentItems = [], deliveryAttempts = [], orders = [], transactions = [] } = context;

  // 1. BasGate / Electronic Gateway Path (payment_items -> payments)
  let matchedPi: any = null;
  if (paymentItems.length > 0) {
    matchedPi = paymentItems.find((pi: any) => {
      if (!pi) return false;
      if (pi.card_id && pi.card_id === card.id) return true;
      if (Array.isArray(pi.card_ids) && pi.card_ids.includes(card.id)) return true;
      if (card.payment_item_id && pi.id === card.payment_item_id) return true;
      return false;
    });
  }

  if (matchedPi) {
    const payment = payments.find((p: any) => p && p.id === matchedPi.payment_id);
    const gross = Number(matchedPi.total_price || cardPrice);
    const comm = Number(matchedPi.platform_commission_amount || 0);
    const net = Number(matchedPi.network_owner_amount != null ? matchedPi.network_owner_amount : (gross - comm));
    
    // Rate in payment_items is stored as numeric fraction or percent (e.g. 0.0500 for 5%)
    let rate: number | null = null;
    if (matchedPi.platform_commission_rate != null) {
      const rawRate = Number(matchedPi.platform_commission_rate);
      rate = rawRate <= 1 && rawRate > 0 ? Math.round(rawRate * 10000) / 100 : rawRate;
    } else if (gross > 0) {
      rate = Math.round((comm / gross) * 10000) / 100;
    }

    const finRef = formatMasterTransactionId(matchedPi.payment_id || payment?.id);

    const isCompleted = 
      payment?.status === 'completed' || 
      payment?.status === 'successful' || 
      isCardSold(card) ||
      transactions.some((tx: any) => 
        tx && 
        (String(tx.reference_id).toLowerCase() === String(matchedPi.payment_id).toLowerCase() || 
         (payment?.id && String(tx.reference_id).toLowerCase() === String(payment.id).toLowerCase())) &&
        (tx.status === 'completed' || tx.status === 'approved')
      );

    return {
      financial_reference: finRef,
      is_financial_reference_available: true,
      card_serial: cardSerial,
      payment_method: payment ? resolvePaymentProviderName(payment) : 'بوابة BasGate',
      gross_amount: gross,
      commission_rate: rate,
      platform_commission: comm,
      net_amount: net,
      status: isCompleted ? 'completed' : 'pending',
      is_fallback: false,
      source_entity: 'payment_item',
      provider_reference: payment?.provider_reference || null,
      ubtr_reference: payment?.provider_reference || null,
    };
  }

  // 2. App Wallet Saga Path (card_delivery_attempts / card.order_id / ubtr -> transactions)
  const matchedDelivery = deliveryAttempts.find((d: any) => d && d.card_id === card.id);
  const orderId = card.order_id || matchedDelivery?.order_id;
  const ubtrRef = card.ubtr_reference || card.ubtr || card.ubtr_id || matchedDelivery?.ubtr_id;

  let matchedTx: any = null;
  if (transactions.length > 0) {
    matchedTx = transactions.find((tx: any) => {
      if (!tx) return false;
      if (orderId && tx.reference_id && String(tx.reference_id).toLowerCase() === String(orderId).toLowerCase()) return true;
      if (ubtrRef && tx.description && tx.description.includes(ubtrRef)) return true;
      if (tx.description && tx.description.includes(card.id)) return true;
      return false;
    });
  }

  if (matchedTx) {
    const net = Math.abs(Number(matchedTx.amount || 0));
    const gross = cardPrice > 0 ? cardPrice : net;
    const comm = Math.round(Math.max(0, gross - net) * 100) / 100;
    const rate = gross > 0 ? Math.round((comm / gross) * 10000) / 100 : 0;
    
    // Parity with VendorAccountStatement:
    // Derives reference strictly via formatMasterTransactionId(tx.reference_id || orderId || tx.id)
    const finRef = matchedTx.reference_id
      ? formatMasterTransactionId(matchedTx.reference_id)
      : (orderId ? formatMasterTransactionId(orderId) : formatMasterTransactionId(matchedTx.id));

    return {
      financial_reference: finRef,
      is_financial_reference_available: true,
      card_serial: cardSerial,
      payment_method: 'محفظة التطبيق',
      gross_amount: gross,
      commission_rate: rate,
      platform_commission: comm,
      net_amount: net,
      status: matchedTx.status === 'completed' ? 'completed' : 'pending',
      is_fallback: false,
      source_entity: 'wallet_transaction',
      ubtr_reference: ubtrRef || null,
    };
  }

  // 3. Order Match without loaded transaction (fallback to order record if present)
  if (orderId && orders.length > 0) {
    const matchedOrder = orders.find((o: any) => o && o.id === orderId);
    if (matchedOrder) {
      const gross = Number(matchedOrder.total_amount || cardPrice);
      const finRef = formatMasterTransactionId(orderId || matchedOrder.id);
      return {
        financial_reference: finRef,
        is_financial_reference_available: true,
        card_serial: cardSerial,
        payment_method: 'محفظة التطبيق',
        gross_amount: gross,
        commission_rate: null,
        platform_commission: 0,
        net_amount: gross,
        status: matchedOrder.status === 'COMPLETED' ? 'completed' : 'pending',
        is_fallback: false,
        source_entity: 'order_record',
        ubtr_reference: matchedOrder.ubtr_reference || ubtrRef || null,
      };
    }
  }

  // 4. Order ID directly on card/delivery without order object
  if (orderId) {
    return {
      financial_reference: formatMasterTransactionId(orderId),
      is_financial_reference_available: true,
      card_serial: cardSerial,
      payment_method: 'محفظة التطبيق',
      gross_amount: cardPrice,
      commission_rate: null,
      platform_commission: 0,
      net_amount: cardPrice,
      status: 'completed',
      is_fallback: false,
      source_entity: 'order_reference',
      ubtr_reference: ubtrRef || null,
    };
  }

  // 5. Explicit card UBTR reference if present
  if (ubtrRef) {
    return {
      financial_reference: formatMasterTransactionId(ubtrRef),
      is_financial_reference_available: true,
      card_serial: cardSerial,
      payment_method: 'محفظة التطبيق',
      gross_amount: cardPrice,
      commission_rate: null,
      platform_commission: 0,
      net_amount: cardPrice,
      status: 'completed',
      is_fallback: false,
      source_entity: 'card_ubtr',
      ubtr_reference: ubtrRef,
    };
  }

  // 5. Unlinked Fallback: Never invent TX-<CARD_ID> as financial reference
  return {
    financial_reference: null,
    is_financial_reference_available: false,
    card_serial: cardSerial,
    payment_method: 'غير محدد',
    gross_amount: cardPrice,
    commission_rate: null,
    platform_commission: 0,
    net_amount: cardPrice,
    status: 'completed',
    is_fallback: true,
    source_entity: 'unlinked_card',
  };
}

/**
 * Resolve the operation number shown in reports.
 * Priority: canonical UBTR, then explicit operation/payment reference, then legacy TX fallback.
 */
export function resolveOperationNumber(
  record: Record<string, any> | null | undefined, 
  fallbackId?: string,
  context?: UnifiedTransactionContext
): string {
  if (!record) return fallbackId ? formatMasterTransactionId(fallbackId) : 'TX-00000000';

  // If context is provided and this is a card with card fields, route through unified resolver
  if (context && (record.category_id || record.network_id || record.payment_item_id || record.reserved_for_payment_id)) {
    const resolved = resolveUnifiedCardTransaction(record, context);
    return resolved.ubtr;
  }

  const value =
    record?.ubtr ||
    record?.ubtr_reference ||
    record?.ubtr_id ||
    record?.operation_number ||
    record?.payment_id ||
    record?.reserved_for_payment_id ||
    record?.order_id ||
    fallbackId ||
    record?.id ||
    '';

  return formatMasterTransactionId(String(value));
}

/**
 * Build unified sub-references for Enterprise Financial Inspection
 */
export function buildSubReferences(type: string, rawId: string, customRef?: string) {
  const hex = rawId.substring(0, 8).toUpperCase();
  return {
    order_id: type === 'purchase' ? `ORD-${hex}` : undefined,
    withdrawal_id: type === 'withdrawal' ? `WDR-${hex}` : undefined,
    bank_settlement_id: type === 'withdrawal' ? `BANK-SETTLE-${hex}` : undefined,
    basgate_ref: customRef || (type === 'deposit' ? `BAS-${hex}` : undefined),
    audit_id: `AUD-${hex}`,
    sms_id: `SMS-${hex}`,
  };
}
