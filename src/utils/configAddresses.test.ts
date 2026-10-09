import { describe, it, expect } from "vitest";
import { isAddress } from "viem";
import { chainConfig as mainnetConfig, GATEWAY_WALLET_ADDRESS as MW, GATEWAY_MINTER_ADDRESS as MM, SPLITTY_BATCHER_ADDRESS as MS } from "../config/gateway.mainnet";
import { chainConfig as testnetConfig, GATEWAY_WALLET_ADDRESS as TW, GATEWAY_MINTER_ADDRESS as TM } from "../config/gateway";
import { FORWARDER_ADDRESS } from "./multicall";

// ─── Shared top-level contract addresses ──────────────────────────────────────

describe("mainnet top-level addresses", () => {
  it("GATEWAY_WALLET_ADDRESS is valid", () => {
    expect(isAddress(MW, { strict: true }), `GATEWAY_WALLET_ADDRESS: ${MW}`).toBe(true);
  });
  it("GATEWAY_MINTER_ADDRESS is valid", () => {
    expect(isAddress(MM, { strict: true }), `GATEWAY_MINTER_ADDRESS: ${MM}`).toBe(true);
  });
  it("SPLITTY_BATCHER_ADDRESS is valid", () => {
    expect(isAddress(MS, { strict: true }), `SPLITTY_BATCHER_ADDRESS: ${MS}`).toBe(true);
  });
  it("FORWARDER_ADDRESS is valid", () => {
    expect(isAddress(FORWARDER_ADDRESS, { strict: true }), `FORWARDER_ADDRESS: ${FORWARDER_ADDRESS}`).toBe(true);
  });
});

describe("testnet top-level addresses", () => {
  it("GATEWAY_WALLET_ADDRESS is valid", () => {
    expect(isAddress(TW, { strict: true }), `GATEWAY_WALLET_ADDRESS: ${TW}`).toBe(true);
  });
  it("GATEWAY_MINTER_ADDRESS is valid", () => {
    expect(isAddress(TM, { strict: true }), `GATEWAY_MINTER_ADDRESS: ${TM}`).toBe(true);
  });
});

// ─── Per-chain usdcAddress ────────────────────────────────────────────────────

describe("mainnet chainConfig usdcAddress checksums", () => {
  for (const [key, cfg] of Object.entries(mainnetConfig)) {
    it(`mainnet.${key}.usdcAddress is valid EIP-55`, () => {
      expect(
        isAddress((cfg as any).usdcAddress, { strict: true }),
        `mainnet.${key}.usdcAddress = ${(cfg as any).usdcAddress}`
      ).toBe(true);
    });
  }
});

describe("testnet chainConfig usdcAddress checksums", () => {
  for (const [key, cfg] of Object.entries(testnetConfig)) {
    it(`testnet.${key}.usdcAddress is valid EIP-55`, () => {
      expect(
        isAddress((cfg as any).usdcAddress, { strict: true }),
        `testnet.${key}.usdcAddress = ${(cfg as any).usdcAddress}`
      ).toBe(true);
    });
  }
});
