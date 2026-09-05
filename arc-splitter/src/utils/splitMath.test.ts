import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";
import { splitEqually } from "./splitMath";

const USDC = 6;

/** Sum shares the way the contract will: in integer base units. */
const sum = (shares: string[], decimals = USDC) =>
  shares.reduce((acc, s) => acc + parseUnits(s, decimals), 0n);

describe("splitEqually", () => {
  it("divides evenly when it can", () => {
    expect(splitEqually("90", 3, USDC)).toEqual(["30", "30", "30"]);
  });

  it("never sends more than the total (the .toFixed bug)", () => {
    // (2/3).toFixed(6) = "0.666667" -> three shares summed to 2.000001,
    // overspending the user's balance.
    const shares = splitEqually("2", 3, USDC);
    expect(sum(shares)).toBe(parseUnits("2", USDC));
    expect(sum(shares)).not.toBeGreaterThan(parseUnits("2", USDC));
  });

  it("never leaves dust behind either", () => {
    // These all used to lose fractions of a cent to rounding down.
    for (const [total, count] of [
      ["1", 3],
      ["100", 3],
      ["10", 7],
      ["0.000001", 3],
    ] as const) {
      expect(sum(splitEqually(total, count, USDC))).toBe(
        parseUnits(total, USDC)
      );
    }
  });

  it("spreads the remainder one base unit at a time", () => {
    // 1 USDC / 3 = 0.333333 with a remainder of 1 base unit.
    expect(splitEqually("1", 3, USDC)).toEqual([
      "0.333334",
      "0.333333",
      "0.333333",
    ]);
  });

  it("handles a total smaller than the recipient count", () => {
    // 2 base units across 3 people: two get a unit, one gets nothing.
    expect(splitEqually("0.000002", 3, USDC)).toEqual([
      "0.000001",
      "0.000001",
      "0",
    ]);
  });

  it("respects token decimals other than 6", () => {
    const shares = splitEqually("1", 3, 18);
    expect(sum(shares, 18)).toBe(parseUnits("1", 18));
  });

  it("returns nothing for a non-positive count", () => {
    expect(splitEqually("10", 0, USDC)).toEqual([]);
  });

  it("handles a zero total", () => {
    expect(splitEqually("0", 3, USDC)).toEqual(["0", "0", "0"]);
  });
});
