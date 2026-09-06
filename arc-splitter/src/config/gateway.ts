import { type Address } from "viem";
import { arcTestnet, baseSepolia, sepolia } from "viem/chains";

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
      rpcUrls: ["https://rpc.sepolia.org"],
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },
  },
} as const;

export type ChainKey = keyof typeof chainConfig;
export const CHAIN_KEYS = Object.keys(chainConfig) as ChainKey[];
