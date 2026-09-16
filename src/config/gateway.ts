import { type Address } from "viem";
import {
  arcTestnet,
  avalancheFuji,
  baseSepolia,
  optimismSepolia,
  polygonAmoy,
  sepolia,
} from "viem/chains";

export const GATEWAY_WALLET_ADDRESS: Address =
  "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";

export const GATEWAY_MINTER_ADDRESS: Address =
  "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B";

export const GATEWAY_API_BASE = "https://gateway-api-testnet.circle.com";

export const chainConfig = {
  arc: {
    chain: arcTestnet,
    chainId: arcTestnet.id,
    usdcAddress: "0x3600000000000000000000000000000000000000" as Address,
    domainId: 26,
    label: "Arc Testnet",
    addParams: {
      chainId: `0x${arcTestnet.id.toString(16)}`,
      chainName: "Arc Testnet",
      rpcUrls: ["https://rpc.testnet.arc.network"],
      nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
      blockExplorerUrls: ["https://testnet.arcscan.app"],
    },
  },

  baseSepolia: {
    chain: baseSepolia,
    chainId: baseSepolia.id,
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
    domainId: 6,
    label: "Base Sepolia",
    addParams: {
      chainId: `0x${baseSepolia.id.toString(16)}`,
      chainName: "Base Sepolia",
      rpcUrls: ["https://sepolia.base.org"],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://sepolia.basescan.org"],
    },
  },

  ethereumSepolia: {
    chain: sepolia,
    chainId: sepolia.id,
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address,
    domainId: 0,
    label: "Ethereum Sepolia",
    addParams: {
      chainId: `0x${sepolia.id.toString(16)}`,
      chainName: "Sepolia",
      rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },
  },

  avalancheFuji: {
    chain: avalancheFuji,
    chainId: avalancheFuji.id,
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65" as Address,
    domainId: 1,
    label: "Avalanche Fuji",
    addParams: {
      chainId: `0x${avalancheFuji.id.toString(16)}`,
      chainName: "Avalanche Fuji",
      rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
      nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
      blockExplorerUrls: ["https://testnet.snowtrace.io"],
    },
  },

  opSepolia: {
    chain: optimismSepolia,
    chainId: optimismSepolia.id,
    usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7" as Address,
    domainId: 2,
    label: "OP Sepolia",
    addParams: {
      chainId: `0x${optimismSepolia.id.toString(16)}`,
      chainName: "OP Sepolia",
      rpcUrls: ["https://sepolia.optimism.io"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://sepolia-optimism.etherscan.io"],
    },
  },

  polygonAmoy: {
    chain: polygonAmoy,
    chainId: polygonAmoy.id,
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582" as Address,
    domainId: 7,
    label: "Polygon PoS Amoy",
    addParams: {
      chainId: `0x${polygonAmoy.id.toString(16)}`,
      chainName: "Polygon PoS Amoy",
      rpcUrls: ["https://rpc-amoy.polygon.technology"],
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      blockExplorerUrls: ["https://amoy.polygonscan.com"],
    },
  },
} as const;

export type ChainKey = keyof typeof chainConfig;

/**
 * Existing standard Gateway deposit chains.
 *
 * Keep this list separate so adding Fast Deposit / bridge chains
 * does not accidentally change the working standard deposit flow.
 */
export const STANDARD_GATEWAY_CHAIN_KEYS = [
  "arc",
  "baseSepolia",
  "ethereumSepolia",
] as const;

export type StandardGatewayChainKey =
  (typeof STANDARD_GATEWAY_CHAIN_KEYS)[number];

/**
 * Chains whose Gateway balances we want to display.
 */
export const GATEWAY_BALANCE_CHAIN_KEYS = [
  "arc",
  "baseSepolia",
  "ethereumSepolia",
  "avalancheFuji",
  "polygonAmoy",
] as const;

/**
 * Gateway balance sources that can manually bridge into Arc.
 */
export const BRIDGE_SOURCE_CHAIN_KEYS = [
  "baseSepolia",
  "ethereumSepolia",
  "avalancheFuji",
  "opSepolia",
  "polygonAmoy",
] as const;

/**
 * Preserve the existing name for standard deposit consumers.
 */
export const CHAIN_KEYS =
  STANDARD_GATEWAY_CHAIN_KEYS as readonly StandardGatewayChainKey[];

export const FAST_DEPOSIT_ROUTES = [
  {
    id: "ethereum-sepolia-to-arc",
    sourceKey: "ethereumSepolia",
    sourceChain: "Ethereum_Sepolia",
    destinationKey: "arc",
    destinationChain: "Arc_Testnet",
    label: "Ethereum Sepolia → Arc Testnet",
  },
  {
    id: "ethereum-sepolia-to-avalanche",
    sourceKey: "ethereumSepolia",
    sourceChain: "Ethereum_Sepolia",
    destinationKey: "avalancheFuji",
    destinationChain: "Avalanche_Fuji",
    label: "Ethereum Sepolia → Avalanche Fuji",
  },
  {
    id: "op-sepolia-to-polygon",
    sourceKey: "opSepolia",
    sourceChain: "OP_Sepolia",
    destinationKey: "polygonAmoy",
    destinationChain: "Polygon_PoS_Amoy",
    label: "OP Sepolia → Polygon PoS Amoy",
  },
] as const;
