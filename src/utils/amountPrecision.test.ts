import { describe, expect, it } from "vitest";
import { exceedsTokenPrecision, fractionalDigits } from "./amountPrecision";

const USDC = 6;

describe("fractionalDigits", () => {
  it("counts nothing for a whole number", () => {
    expect(fractionalDigits("10")).toBe(0);
  });

  it("counts the digits after the point", () => {
    expect(fractionalDigits("1.25")).toBe(2);
  });

  it("ignores trailing zeros", () => {
    // Exactly representable, so there is no reason to reject it.
    expect(fractionalDigits("1.5000000")).toBe(1);
    expect(fractionalDigits("2.000000000")).toBe(0);
  });

  it("handles a leading point", () => {
    expect(fractionalDigits(".5")).toBe(1);
  });

  it("ignores surrounding whitespace", () => {
    expect(fractionalDigits("  1.25  ")).toBe(2);
  });

  it("treats scientific notation as unusable", () => {
    expect(fractionalDigits("1e-8")).toBe(Number.POSITIVE_INFINITY);
  });

  it("treats junk as unusable", () => {
    for (const junk of ["abc", "", "1.2.3", "5.", "1,5", "-1.5"]) {
      expect(fractionalDigits(junk)).toBe(Number.POSITIVE_INFINITY);
    }
  });
});

describe("exceedsTokenPrecision", () => {
  it("accepts an amount within the token's decimals", () => {
    expect(exceedsTokenPrecision("1.123456", USDC)).toBe(false);
  });

  it("rejects one digit too many", () => {
    // parseUnits would round this to 2 and send more than was asked for.
    expect(exceedsTokenPrecision("1.9999999", USDC)).toBe(true);
  });

  it("rejects the half-unit case that rounds up from nothing", () => {
    expect(exceedsTokenPrecision("0.0000005", USDC)).toBe(true);
  });

  it("accepts a whole number", () => {
    expect(exceedsTokenPrecision("100", USDC)).toBe(false);
  });

  it("accepts padding zeros beyond the token's decimals", () => {
    expect(exceedsTokenPrecision("1.5000000000", USDC)).toBe(false);
  });

  it("respects an 18-decimal token", () => {
    expect(exceedsTokenPrecision("1.123456789012345678", 18)).toBe(false);
    expect(exceedsTokenPrecision("1.1234567890123456789", 18)).toBe(true);
  });

  it("rejects any fraction on a 0-decimal token", () => {
    expect(exceedsTokenPrecision("1.5", 0)).toBe(true);
    expect(exceedsTokenPrecision("1", 0)).toBe(false);
  });

  it("rejects unusable input", () => {
    expect(exceedsTokenPrecision("1e-8", USDC)).toBe(true);
  });
});
