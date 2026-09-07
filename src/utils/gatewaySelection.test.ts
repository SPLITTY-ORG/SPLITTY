import { describe, expect, it } from "vitest";
import { getBestGatewaySource } from "./gatewaySelection";

// Domain ids: 0 = Ethereum Sepolia, 6 = Base Sepolia, 26 = Arc.
// Arc is the destination, so it is never a source.
const ETH = 0;
const BASE = 6;
const ARC = 26;

const bal = (domain: number, balance: string) => ({ domain, balance });

describe("getBestGatewaySource", () => {
  it("returns nothing when there are no balances at all", () => {
    expect(getBestGatewaySource(10, [])).toBeNull();
  });

  it("returns nothing when every balance is zero", () => {
    expect(getBestGatewaySource(10, [bal(ETH, "0"), bal(BASE, "0")])).toBeNull();
  });

  it("never picks Arc, which is the destination", () => {
    // A large Arc balance must not be offered as a bridge source.
    expect(getBestGatewaySource(10, [bal(ARC, "9999")])).toBeNull();
  });

  it("picks the only chain that has funds", () => {
    const chosen = getBestGatewaySource(10, [bal(BASE, "50"), bal(ETH, "0")]);
    expect(chosen?.domainId).toBe(BASE);
  });

  it("prefers the cheaper chain when both can cover the amount", () => {
    // Base Sepolia is the cheaper gas estimate, so it wins even though
    // Ethereum Sepolia holds more.
    const chosen = getBestGatewaySource(10, [bal(BASE, "20"), bal(ETH, "500")]);
    expect(chosen?.domainId).toBe(BASE);
  });

  it("falls back to the richer chain when the cheap one is short", () => {
    const chosen = getBestGatewaySource(100, [bal(BASE, "20"), bal(ETH, "500")]);
    expect(chosen?.domainId).toBe(ETH);
  });

  it("treats a balance exactly equal to the amount as sufficient", () => {
    const chosen = getBestGatewaySource(20, [bal(BASE, "20")]);
    expect(chosen?.domainId).toBe(BASE);
    expect(chosen?.balance).toBe(20);
  });

  it("still returns the largest source when nothing can cover the amount", () => {
    // The caller is expected to warn about the shortfall rather than this
    // returning null, so a partial bridge is still possible.
    const chosen = getBestGatewaySource(1000, [bal(BASE, "20"), bal(ETH, "50")]);
    expect(chosen?.domainId).toBe(ETH);
    expect(chosen?.balance).toBe(50);
  });

  it("ignores a chain it was given no balance for", () => {
    const chosen = getBestGatewaySource(5, [bal(BASE, "10")]);
    expect(chosen?.domainId).toBe(BASE);
  });

  it("survives a non-numeric balance instead of selecting it", () => {
    // parseFloat("abc") is NaN, and NaN > 0 is false, so it drops out.
    expect(getBestGatewaySource(5, [bal(BASE, "abc")])).toBeNull();
  });

  it("ignores a negative balance", () => {
    expect(getBestGatewaySource(5, [bal(BASE, "-10")])).toBeNull();
  });

  it("reports a label and key for whatever it picks", () => {
    const chosen = getBestGatewaySource(5, [bal(BASE, "10")]);
    expect(chosen?.label).toBeTruthy();
    expect(chosen?.key).toBeTruthy();
  });
});
