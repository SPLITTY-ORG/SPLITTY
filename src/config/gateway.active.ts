/**
 * gateway.active.ts — single import point for all Gateway config.
 *
 * Set VITE_APP_ENV=mainnet in your production .env to switch every component
 * to mainnet addresses and chains automatically. Defaults to testnet.
 */

import * as testnet from "./gateway";
import * as mainnet from "./gateway.mainnet";

export const IS_MAINNET = import.meta.env.VITE_APP_ENV === "mainnet";

const cfg = IS_MAINNET ? mainnet : testnet;

export const GATEWAY_WALLET_ADDRESS = cfg.GATEWAY_WALLET_ADDRESS;
export const GATEWAY_MINTER_ADDRESS = cfg.GATEWAY_MINTER_ADDRESS;
export const GATEWAY_API_BASE = cfg.GATEWAY_API_BASE;
export const chainConfig = cfg.chainConfig;
export const FAST_DEPOSIT_ROUTES = cfg.FAST_DEPOSIT_ROUTES;
export const GATEWAY_ENV: "testnet" | "mainnet" = IS_MAINNET ? "mainnet" : "testnet";

// CHAIN_KEYS: deposit-capable chains (arc + source chains on testnet;
// source chains only on mainnet since arc is the destination, not a gateway source)
export const CHAIN_KEYS = IS_MAINNET
  ? (mainnet.GATEWAY_SOURCE_CHAIN_KEYS as unknown as readonly (keyof typeof mainnet.chainConfig)[])
  : (testnet.STANDARD_GATEWAY_CHAIN_KEYS as unknown as readonly (keyof typeof testnet.chainConfig)[]);

export const GATEWAY_BALANCE_CHAIN_KEYS = IS_MAINNET
  ? mainnet.GATEWAY_BALANCE_CHAIN_KEYS
  : testnet.GATEWAY_BALANCE_CHAIN_KEYS;

export const BRIDGE_SOURCE_CHAIN_KEYS = IS_MAINNET
  ? mainnet.BRIDGE_SOURCE_CHAIN_KEYS
  : testnet.BRIDGE_SOURCE_CHAIN_KEYS;

// Unified ChainKey type covering both envs
export type ChainKey = keyof typeof testnet.chainConfig | keyof typeof mainnet.chainConfig;
