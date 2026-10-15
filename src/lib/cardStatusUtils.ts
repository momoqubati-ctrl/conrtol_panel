/**
 * Card Status Normalization and Case-Insensitive Matching Utilities.
 * Enforces robust, null-safe normalization of card lifecycle statuses.
 */

export type NormalizedCardStatus = 'available' | 'sold' | 'reserved' | 'unknown';

/**
 * Normalizes any card status string or unknown input to canonical lowercase status.
 * Handles null, undefined, uppercase (SOLD, AVAILABLE), mixed case (Sold, Available),
 * and unexpected input gracefully without throwing.
 */
export function normalizeCardStatus(status: unknown): NormalizedCardStatus {
  if (status === null || status === undefined) {
    return 'unknown';
  }
  const clean = String(status).trim().toLowerCase();
  if (clean === 'sold') return 'sold';
  if (clean === 'available') return 'available';
  if (clean === 'reserved') return 'reserved';
  return 'unknown';
}

/**
 * Null-safe predicate checking whether a card is sold.
 * Matches 'sold', 'SOLD', 'Sold' etc.
 */
export function isCardSold(card: { status?: unknown } | null | undefined): boolean {
  if (!card) return false;
  return normalizeCardStatus(card.status) === 'sold';
}

/**
 * Null-safe predicate checking whether a card is available.
 * Matches 'available', 'AVAILABLE', 'Available' etc.
 */
export function isCardAvailable(card: { status?: unknown } | null | undefined): boolean {
  if (!card) return false;
  return normalizeCardStatus(card.status) === 'available';
}

/**
 * Null-safe predicate checking whether a card is reserved.
 * Matches 'reserved', 'RESERVED', 'Reserved' etc.
 */
export function isCardReserved(card: { status?: unknown } | null | undefined): boolean {
  if (!card) return false;
  return normalizeCardStatus(card.status) === 'reserved';
}
