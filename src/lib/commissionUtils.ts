/**
 * Commission Utilities & Validation Rules
 * Single Source of Truth for Platform Commission Calculations across Admin & Vendor Panels
 * Task ID: SHABAKATI-COMMISSION-UNIFICATION-DEV-01
 */

export interface CommissionValidationResult {
  valid: boolean;
  normalizedRate: number;
  error?: string;
  warning?: string;
}

export interface CommissionBreakdown {
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorNetAmount: number;
}

/**
 * Validates admin input for vendor commission rate.
 * Enforces business boundary: [0.00%, 50.00%].
 * Detects potential user confusion between 5% and 0.05%.
 */
export function validateCommissionRate(input: number | string | null | undefined): CommissionValidationResult {
  if (input === null || input === undefined || input === '') {
    return {
      valid: false,
      normalizedRate: 0,
      error: 'يرجى إدخال نسبة العمولة.',
    };
  }

  const numericValue = typeof input === 'number' ? input : parseFloat(String(input).trim());

  if (!Number.isFinite(numericValue) || isNaN(numericValue)) {
    return {
      valid: false,
      normalizedRate: 0,
      error: 'نسبة العمولة يجب أن تكون قيمة رقمية صحيحة.',
    };
  }

  if (numericValue < 0) {
    return {
      valid: false,
      normalizedRate: numericValue,
      error: 'نسبة العمولة لا يمكن أن تكون قيمة سالبة.',
    };
  }

  if (numericValue > 50) {
    return {
      valid: false,
      normalizedRate: numericValue,
      error: 'الحد الأقصى المسموح به لنسبة عمولة المنصة هو 50%.',
    };
  }

  // Fractional rate alert: detect if user typed 0.05 intending 5%
  let warning: string | undefined;
  if (numericValue > 0 && numericValue < 1) {
    warning = `تنبيه: أدخلت نسبة كسرية (${numericValue}%). هذا يعني اقتطاع ${numericValue} ريال فقط لكل 100 ريال. إذا كنت تقصد ${numericValue * 100}%، يرجى كتابة الرقم ${numericValue * 100}.`;
  }

  return {
    valid: true,
    normalizedRate: Math.round(numericValue * 100) / 100,
    warning,
  };
}

/**
 * Calculates platform commission and net vendor payout with precise 2 decimal places.
 * Guarantees mathematical equality: grossAmount = commissionAmount + vendorNetAmount.
 */
export function calculateCommissionBreakdown(
  grossAmount: number,
  commissionRate: number
): CommissionBreakdown {
  const safeGross = Number.isFinite(grossAmount) ? Math.max(0, grossAmount) : 0;
  const safeRate = Number.isFinite(commissionRate) ? Math.max(0, commissionRate) : 0;

  // Rate in decimal: 5% -> 0.05, 0.05% -> 0.0005, 0% -> 0
  const rateMultiplier = safeRate / 100.0;
  
  // Exact 2-decimal financial rounding (cents/philos)
  const commissionAmount = Math.round(safeGross * rateMultiplier * 100) / 100;
  const vendorNetAmount = Math.round((safeGross - commissionAmount) * 100) / 100;

  return {
    grossAmount: safeGross,
    commissionRate: safeRate,
    commissionAmount,
    vendorNetAmount,
  };
}

/**
 * Formats commission percentage string cleanly.
 */
export function formatCommissionRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) {
    return '0%';
  }
  return `${rate}%`;
}
