import { type Address } from "viem";
import {
  base,
  mainnet,
  optimism,
  avalanche,
  polygon,
} from "viem/chains";
import { arc } from "../chains/arc";

// ─── Gateway contract addresses (mainnet) ────────────────────────────────────
export const GATEWAY_WALLET_ADDRESS: Address =
  "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE";

export const GATEWAY_MINTER_ADDRESS: Address =
  "0x2222222d7164433c4C09B0b0D809a9b52C04C205";

export const GATEWAY_API_BASE = "https://gateway-api.circle.com";

// ─── SplittyBatcher on Arc Mainnet ───────────────────────────────────────────
// Same Multicall3From forwarder address as testnet (predeployed on Arc mainnet)
export const SPLITTY_BATCHER_ADDRESS: Address =
  "0x941E49c0cF2F76Cc4f79D9fd1E4A892893e90032";

export const FORWARDER_ADDRESS: Address =
  "0x522fAf9A91c41c443c66765030741e4AaCe147D0";

// ─── Chain config ─────────────────────────────────────────────────────────────
export const chainConfig = {
  arc: {
    chain: arc,
    chainId: arc.id,
    usdcAddress: "0x3600000000000000000000000000000000000000" as Address,
    // Arc is the destination chain — it is NOT a Gateway source on mainnet.
    // Gateway only lists Arc on testnet (domain 26). On mainnet Arc acts as
    // the execution chain; funds flow in from the chains below via Gateway.
    domainId: null as null,
    iconKey: "arc" as const,
    label: "Arc",
    addParams: {
      chainId: `0x${arc.id.toString(16)}`,
      chainName: "Arc",
      rpcUrls: ["https://rpc.mainnet.arc.io"],
      nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
      blockExplorerUrls: ["https://explorer.arc.io"],
    },
  },

  base: {
    chain: base,
    chainId: base.id,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address,
    domainId: 6,
    iconKey: "base" as const,
    label: "Base",
    addParams: {
      chainId: `0x${base.id.toString(16)}`,
      chainName: "Base",
      rpcUrls: ["https://mainnet.base.org"],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://basescan.org"],
    },
  },

  ethereum: {
    chain: mainnet,
    chainId: mainnet.id,
    usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
    domainId: 0,
    iconKey: "ethereum" as const,
    label: "Ethereum",
    addParams: {
      chainId: `0x${mainnet.id.toString(16)}`,
      chainName: "Ethereum",
      rpcUrls: ["https://ethereum-rpc.publicnode.com"],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://etherscan.io"],
    },
  },

  avalanche: {
    chain: avalanche,
    chainId: avalanche.id,
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E" as Address,
    domainId: 1,
    iconKey: "avalanche" as const,
    label: "Avalanche",
    addParams: {
      chainId: `0x${avalanche.id.toString(16)}`,
      chainName: "Avalanche",
      rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
      nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
      blockExplorerUrls: ["https://snowtrace.io"],
    },
  },

  op: {
    chain: optimism,
    chainId: optimism.id,
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85" as Address,
    domainId: 2,
    iconKey: "op" as const,
    label: "OP Mainnet",
    addParams: {
      chainId: `0x${optimism.id.toString(16)}`,
      chainName: "OP Mainnet",
      rpcUrls: ["https://mainnet.optimism.io"],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://optimistic.etherscan.io"],
    },
  },

  polygon: {
    chain: polygon,
    chainId: polygon.id,
    usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as Address,
    domainId: 7,
    iconKey: "polygon" as const,
    label: "Polygon PoS",
    addParams: {
      chainId: `0x${polygon.id.toString(16)}`,
      chainName: "Polygon PoS",
      rpcUrls: ["https://polygon-bor-rpc.publicnode.com"],
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      blockExplorerUrls: ["https://polygonscan.com"],
    },
  },
} as const;

export type ChainKey = keyof typeof chainConfig;

// Gateway deposit source chains (everything except Arc itself)
export const GATEWAY_SOURCE_CHAIN_KEYS = [
  "base",
  "ethereum",
  "avalanche",
  "op",
  "polygon",
] as const;
export type GatewaySourceChainKey = (typeof GATEWAY_SOURCE_CHAIN_KEYS)[number];

// Chains whose Gateway balances to display
export const GATEWAY_BALANCE_CHAIN_KEYS = GATEWAY_SOURCE_CHAIN_KEYS;

// Bridge source chains (same as source)
export const BRIDGE_SOURCE_CHAIN_KEYS = GATEWAY_SOURCE_CHAIN_KEYS;

// Fast deposit routes on mainnet (Ethereum → Arc via Gateway would require
// Arc mainnet Gateway support; for now these mirror the testnet pattern using
// the chains that DO have mainnet Gateway support)
export const FAST_DEPOSIT_ROUTES = [
  {
    id: "ethereum-to-base",
    sourceKey: "ethereum",
    sourceChain: "Ethereum",
    destinationKey: "base",
    destinationChain: "Base",
    label: "Ethereum → Base",
  },
  {
    id: "ethereum-to-avalanche",
    sourceKey: "ethereum",
    sourceChain: "Ethereum",
    destinationKey: "avalanche",
    destinationChain: "Avalanche",
    label: "Ethereum → Avalanche",
  },
  {
    id: "op-to-polygon",
    sourceKey: "op",
    sourceChain: "OP",
    destinationKey: "polygon",
    destinationChain: "Polygon_PoS",
    label: "OP → Polygon PoS",
  },
] as const;
