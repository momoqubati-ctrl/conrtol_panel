/**
 * Unit tests for Card Status Normalization Utilities.
 * Verifies case-insensitivity, null-safety, and edge cases for cards.status.
 */

import {
  normalizeCardStatus,
  isCardSold,
  isCardAvailable,
  isCardReserved,
} from './cardStatusUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- Starting Card Status Normalization Unit Tests ---');

// Test 1: normalizeCardStatus
assert(normalizeCardStatus('sold') === 'sold', 'normalizeCardStatus: lowercase sold');
assert(normalizeCardStatus('SOLD') === 'sold', 'normalizeCardStatus: uppercase SOLD');
assert(normalizeCardStatus('Sold') === 'sold', 'normalizeCardStatus: capitalized Sold');
assert(normalizeCardStatus('  sold  ') === 'sold', 'normalizeCardStatus: whitespace trimmed sold');
assert(normalizeCardStatus('available') === 'available', 'normalizeCardStatus: lowercase available');
assert(normalizeCardStatus('AVAILABLE') === 'available', 'normalizeCardStatus: uppercase AVAILABLE');
assert(normalizeCardStatus('reserved') === 'reserved', 'normalizeCardStatus: lowercase reserved');
assert(normalizeCardStatus('RESERVED') === 'reserved', 'normalizeCardStatus: uppercase RESERVED');
assert(normalizeCardStatus(null) === 'unknown', 'normalizeCardStatus: null returns unknown');
assert(normalizeCardStatus(undefined) === 'unknown', 'normalizeCardStatus: undefined returns unknown');
assert(normalizeCardStatus('') === 'unknown', 'normalizeCardStatus: empty string returns unknown');
assert(normalizeCardStatus('cancelled') === 'unknown', 'normalizeCardStatus: unexpected status returns unknown');

// Test 2: isCardSold predicate
assert(isCardSold({ status: 'sold' }) === true, 'isCardSold: status lowercase sold');
assert(isCardSold({ status: 'SOLD' }) === true, 'isCardSold: status uppercase SOLD');
assert(isCardSold({ status: 'Sold' }) === true, 'isCardSold: status mixed case Sold');
assert(isCardSold({ status: 'available' }) === false, 'isCardSold: status available returns false');
assert(isCardSold({ status: 'AVAILABLE' }) === false, 'isCardSold: status AVAILABLE returns false');
assert(isCardSold({ status: null }) === false, 'isCardSold: status null returns false');
assert(isCardSold({ status: undefined }) === false, 'isCardSold: status undefined returns false');
assert(isCardSold(null) === false, 'isCardSold: null card returns false');
assert(isCardSold(undefined) === false, 'isCardSold: undefined card returns false');
assert(isCardSold({}) === false, 'isCardSold: empty object returns false');

// Test 3: isCardAvailable predicate
assert(isCardAvailable({ status: 'available' }) === true, 'isCardAvailable: status lowercase available');
assert(isCardAvailable({ status: 'AVAILABLE' }) === true, 'isCardAvailable: status uppercase AVAILABLE');
assert(isCardAvailable({ status: 'Available' }) === true, 'isCardAvailable: status mixed case Available');
assert(isCardAvailable({ status: 'sold' }) === false, 'isCardAvailable: status sold returns false');
assert(isCardAvailable({ status: 'SOLD' }) === false, 'isCardAvailable: status SOLD returns false');
assert(isCardAvailable(null) === false, 'isCardAvailable: null card returns false');

// Test 4: isCardReserved predicate
assert(isCardReserved({ status: 'reserved' }) === true, 'isCardReserved: status lowercase reserved');
assert(isCardReserved({ status: 'RESERVED' }) === true, 'isCardReserved: status uppercase RESERVED');
assert(isCardReserved({ status: 'sold' }) === false, 'isCardReserved: status sold returns false');
assert(isCardReserved(null) === false, 'isCardReserved: null card returns false');

// Test 5: Production simulation - mixed 71 SOLD and 11 sold
const simulatedProductionCards = [
  ...Array(71).fill(null).map((_, i) => ({ id: `card-upper-${i}`, status: 'SOLD', price: 95 })),
  ...Array(11).fill(null).map((_, i) => ({ id: `card-lower-${i}`, status: 'sold', price: 95 })),
  ...Array(20).fill(null).map((_, i) => ({ id: `card-avail-${i}`, status: 'available', price: 95 })),
];

const totalSold = simulatedProductionCards.filter(isCardSold).length;
const totalAvailable = simulatedProductionCards.filter(isCardAvailable).length;
assert(totalSold === 82, `Simulation: totalSold must equal 82 (71 SOLD + 11 sold), got ${totalSold}`);
assert(totalAvailable === 20, `Simulation: totalAvailable must equal 20, got ${totalAvailable}`);

console.log('--- All Card Status Normalization Unit Tests PASSED Successfully! ---');
