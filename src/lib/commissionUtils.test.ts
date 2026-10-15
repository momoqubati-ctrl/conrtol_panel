/**
 * Unit Tests for Commission Utilities & Validation
 * Task ID: SHABAKATI-COMMISSION-UNIFICATION-DEV-01
 */

import {
  validateCommissionRate,
  calculateCommissionBreakdown,
  formatCommissionRate,
} from './commissionUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Starting Commission Utilities Unit Tests ---');

// Test 1: Validation of Valid Rates
const v5 = validateCommissionRate(5);
assert(v5.valid && v5.normalizedRate === 5 && !v5.warning, 'Valid rate 5% accepted without warning');

const v0 = validateCommissionRate(0);
assert(v0.valid && v0.normalizedRate === 0 && !v0.warning, 'Valid rate 0% accepted without warning');

const v50 = validateCommissionRate(50);
assert(v50.valid && v50.normalizedRate === 50 && !v50.warning, 'Valid maximum rate 50% accepted');

const vString = validateCommissionRate(' 7.5 ');
assert(vString.valid && vString.normalizedRate === 7.5, 'Valid string " 7.5 " normalized correctly');

// Test 2: Fractional Rate Warning (0.05% detection vs 5%)
const vFraction = validateCommissionRate(0.05);
assert(vFraction.valid && vFraction.normalizedRate === 0.05, 'Fractional rate 0.05% accepted');
assert(!!vFraction.warning && vFraction.warning.includes('0.05%'), 'Warning generated for fractional rate 0.05% to alert user');

// Test 3: Validation of Invalid Rates
const vNegative = validateCommissionRate(-1);
assert(!vNegative.valid && !!vNegative.error, 'Negative rate -1% rejected');

const vExceed = validateCommissionRate(50.5);
assert(!vExceed.valid && !!vExceed.error, 'Excessive rate 50.5% (> 50%) rejected');

const vNaN = validateCommissionRate('abc');
assert(!vNaN.valid && !!vNaN.error, 'Non-numeric string rejected');

const vNull = validateCommissionRate(null);
assert(!vNull.valid && !!vNull.error, 'Null value rejected');

// Test 4: Financial Breakdown Calculations (Exact 2-decimal parity)
// Scenario A: 5% on 100 YER -> 5 YER platform, 95 YER net
const b5 = calculateCommissionBreakdown(100, 5);
assert(b5.grossAmount === 100, 'Gross is 100 YER');
assert(b5.commissionAmount === 5, 'Platform commission is 5.00 YER');
assert(b5.vendorNetAmount === 95, 'Vendor net is 95.00 YER');
assert(b5.commissionAmount + b5.vendorNetAmount === b5.grossAmount, 'Sum matches gross: 5 + 95 = 100');

// Scenario B: 0.05% on 100 YER -> 0.05 YER platform, 99.95 YER net (PRESERVE PRECISION, DO NOT ROUND TO 0)
const bFraction = calculateCommissionBreakdown(100, 0.05);
assert(bFraction.commissionAmount === 0.05, 'Platform commission is exactly 0.05 YER (not 0)');
assert(bFraction.vendorNetAmount === 99.95, 'Vendor net is exactly 99.95 YER');
assert(bFraction.commissionAmount + bFraction.vendorNetAmount === 100, 'Sum matches gross: 0.05 + 99.95 = 100.00');

// Scenario C: 0% on 100 YER -> 0 YER platform, 100 YER net
const b0 = calculateCommissionBreakdown(100, 0);
assert(b0.commissionAmount === 0, 'Platform commission is 0 YER');
assert(b0.vendorNetAmount === 100, 'Vendor net is 100 YER');
assert(b0.commissionAmount + b0.vendorNetAmount === 100, 'Sum matches gross: 0 + 100 = 100');

// Scenario D: 5% on 1000 YER -> 50 YER platform, 950 YER net
const b1000 = calculateCommissionBreakdown(1000, 5);
assert(b1000.commissionAmount === 50, 'Platform commission is 50 YER on 1000 YER');
assert(b1000.vendorNetAmount === 950, 'Vendor net is 950 YER on 1000 YER');

// Test 5: String Formatting
assert(formatCommissionRate(5) === '5%', 'formatCommissionRate(5) -> "5%"');
assert(formatCommissionRate(0.05) === '0.05%', 'formatCommissionRate(0.05) -> "0.05%"');
assert(formatCommissionRate(0) === '0%', 'formatCommissionRate(0) -> "0%"');
assert(formatCommissionRate(null) === '0%', 'formatCommissionRate(null) -> "0%"');

console.log('--- All Commission Utilities Unit Tests PASSED Successfully! ---');
