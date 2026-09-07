/** A plain decimal number. Scientific notation and signs are not accepted. */
const PLAIN_DECIMAL = /^\d*\.?\d+$/;

/**
 * Count the meaningful digits after the decimal point.
 *
 * Trailing zeros do not count, so "1.5000000" is one digit rather than seven —
 * it is exactly representable and there is no reason to reject it.
 *
 * Anything that is not a plain decimal (scientific notation, a sign, stray
 * characters) returns Infinity, so callers treat it as too precise rather than
 * silently accepting a value they cannot reason about.
 */
export function fractionalDigits(amount: string): number {
  const trimmed = amount.trim();
  if (!PLAIN_DECIMAL.test(trimmed)) return Number.POSITIVE_INFINITY;

  const dot = trimmed.indexOf(".");
  if (dot === -1) return 0;

  return trimmed.slice(dot + 1).replace(/0+$/, "").length;
}

/**
 * True when an amount carries more precision than the token can hold.
 *
 * viem's parseUnits rounds rather than truncates, so an amount with excess
 * decimals is sent as a different number than the one on screen: at 6 decimals
 * "1.9999999" becomes 2. Rejecting the input is preferable to quietly sending
 * more than the user asked for.
 */
export function exceedsTokenPrecision(amount: string, decimals: number): boolean {
  return fractionalDigits(amount) > decimals;
}
