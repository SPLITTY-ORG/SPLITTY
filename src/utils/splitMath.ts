import { formatUnits, parseUnits } from "viem";

/**
 * Divide `total` into `count` equal shares.
 *
 * Works in integer base units (the same units the token contract uses) so the
 * shares always add back up to exactly `total`. Dividing in decimal and
 * rounding each share independently does not: `(2 / 3).toFixed(6)` is
 * "0.666667", and three of those sum to 2.000001 — more than the user asked
 * to send.
 *
 * When the total does not divide evenly there is a remainder of a few base
 * units (a millionth of a USDC each). Those go one apiece to the earliest
 * recipients, so shares differ by at most one base unit and the sum is exact.
 */
export function splitEqually(
  total: string,
  count: number,
  decimals: number
): string[] {
  if (count <= 0) return [];

  const totalUnits = parseUnits(total, decimals);
  const n = BigInt(count);

  const base = totalUnits / n;
  const remainder = totalUnits % n;

  return Array.from({ length: count }, (_, i) =>
    formatUnits(base + (BigInt(i) < remainder ? 1n : 0n), decimals)
  );
}
