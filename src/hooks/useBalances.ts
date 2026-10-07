import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallets } from "@privy-io/react-auth";
import { createPublicClient, http, erc20Abi, type Address } from "viem";
import { chainConfig, GATEWAY_API_BASE, IS_MAINNET } from "../config/gateway.active";

export const balanceKeys = {
  wallet: (chainId: number, tokenAddress: string, walletAddress: string) =>
    ["balance", "wallet", chainId, tokenAddress, walletAddress] as const,
  gateway: (domainId: number, walletAddress: string) =>
    ["balance", "gateway", domainId, walletAddress] as const,
  all: (walletAddress: string) => ["balance", walletAddress] as const,
};

const WALLET_SESSION_KEY = "splitty-wallet-session";

function getPreferredWallet(
  wallets: Array<{
    address: Address;
    walletClientType?: string;
  }>
) {
  const session =
    typeof window !== "undefined"
      ? window.localStorage.getItem(WALLET_SESSION_KEY)
      : null;

  const externalWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType !== "privy" &&
      wallet.walletClientType !== "privy-v2"
  );

  const embeddedWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === "privy" ||
      wallet.walletClientType === "privy-v2"
  );

  if (session === "privy") {
    return embeddedWallet ?? externalWallet ?? wallets[0];
  }

  if (session === "external") {
    return externalWallet ?? embeddedWallet ?? wallets[0];
  }

  return externalWallet ?? embeddedWallet ?? wallets[0];
}

async function fetchWalletBalance(
  chainId: number,
  tokenAddress: Address,
  walletAddress: Address
): Promise<string> {
  const chain = Object.values(chainConfig).find(c => c.chainId === chainId);
  if (!chain) throw new Error(`Chain ${chainId} not configured`);
  const rpcUrl = chain.addParams?.rpcUrls?.[0] ?? chain.chain.rpcUrls?.default?.http?.[0];
  const client = createPublicClient({
    chain: chain.chain,
    transport: http(rpcUrl),
  });
  const balance = await client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [walletAddress],
  });
  return balance.toString();
}

async function fetchGatewayBalance(
  domainId: number,
  walletAddress: Address
): Promise<string> {
  const response = await fetch(`${GATEWAY_API_BASE}/v1/balances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "USDC",
      sources: [{ domain: domainId, depositor: walletAddress }],
    }),
  });
  if (!response.ok) throw new Error("Failed to fetch Gateway balance");
  const json = await response.json();
  const balance = json.balances?.find((b: any) => b.domain === domainId);
  const value = balance?.balance;

  if (typeof value !== "string" && typeof value !== "number") {
    return "0";
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue >= 0
    ? String(numericValue)
    : "0";
}

export function useWalletBalance(tokenAddress: Address, chainId?: number) {
  const { wallets } = useWallets();
  const walletAddress = getPreferredWallet(wallets)?.address as
    | Address
    | undefined;
  const effectiveChainId = chainId ?? (IS_MAINNET ? 5042 : 5042002);
  return useQuery({
    queryKey: balanceKeys.wallet(effectiveChainId, tokenAddress, walletAddress || "0x"),
    queryFn: () =>
      fetchWalletBalance(effectiveChainId, tokenAddress, walletAddress as Address),
    enabled: !!walletAddress && !!tokenAddress,
    staleTime: 10000,
  });
}

export function useGatewayBalance(domainId: number | null) {
  const { wallets } = useWallets();
  const walletAddress = getPreferredWallet(wallets)?.address as
    | Address
    | undefined;
  return useQuery({
    queryKey: balanceKeys.gateway(domainId ?? -1, walletAddress || "0x"),
    queryFn: () => fetchGatewayBalance(domainId as number, walletAddress as Address),
    enabled: !!walletAddress && domainId !== null,
    staleTime: 10000,
  });
}

export function useInvalidateBalances() {
  const queryClient = useQueryClient();
  const { wallets } = useWallets();
  const address = getPreferredWallet(wallets)?.address;

  const invalidateWallet = (chainId: number, tokenAddress: string) => {
    if (!address) return;
    queryClient.invalidateQueries({
      queryKey: balanceKeys.wallet(chainId, tokenAddress, address),
    });
  };

  const invalidateGateway = (domainId: number) => {
    if (!address) return;
    queryClient.invalidateQueries({
      queryKey: balanceKeys.gateway(domainId, address),
    });
  };

  const invalidateAll = () => {
    if (!address) return;
    queryClient.invalidateQueries({
      queryKey: balanceKeys.all(address),
    });
  };

  return { invalidateWallet, invalidateGateway, invalidateAll };
}

export function useAllBalances() {
  const arcCfg = (chainConfig as any).arc;
  const arcChainId: number = arcCfg?.chainId ?? (IS_MAINNET ? 5042 : 5042002);
  const arcUsdc: Address = arcCfg?.usdcAddress ?? "0x3600000000000000000000000000000000000000";
  const arcDomainId: number | null = arcCfg?.domainId ?? null;
  const baseCfg = (chainConfig as any).base ?? (chainConfig as any).baseSepolia;
  const ethCfg = (chainConfig as any).ethereum ?? (chainConfig as any).ethereumSepolia;

  const arcWallet = useWalletBalance(arcUsdc, arcChainId);
  const arcGateway = useGatewayBalance(arcDomainId);
  const baseGateway = useGatewayBalance(baseCfg?.domainId ?? null);
  const ethGateway = useGatewayBalance(ethCfg?.domainId ?? null);

  return {
    arcWallet: arcWallet.data,
    arcGateway: arcGateway.data,
    baseGateway: baseGateway.data,
    ethGateway: ethGateway.data,
    isLoading: arcWallet.isLoading || arcGateway.isLoading || baseGateway.isLoading || ethGateway.isLoading,
    error: arcWallet.error || arcGateway.error || baseGateway.error || ethGateway.error,
    refetch: () => {
      arcWallet.refetch();
      arcGateway.refetch();
      baseGateway.refetch();
      ethGateway.refetch();
    },
  };
}
