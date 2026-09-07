import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { createPublicClient, http, erc20Abi, type Address } from "viem";
import { chainConfig, GATEWAY_API_BASE } from "../config/gateway";

export const balanceKeys = {
  wallet: (chainId: number, tokenAddress: string, walletAddress: string) =>
    ["balance", "wallet", chainId, tokenAddress, walletAddress] as const,
  gateway: (domainId: number, walletAddress: string) =>
    ["balance", "gateway", domainId, walletAddress] as const,
  all: (walletAddress: string) => ["balance", walletAddress] as const,
};

async function fetchWalletBalance(
  chainId: number,
  tokenAddress: Address,
  walletAddress: Address
): Promise<string> {
  const chain = Object.values(chainConfig).find(c => c.chainId === chainId);
  if (!chain) throw new Error(`Chain ${chainId} not configured`);
  const client = createPublicClient({
    chain: chain.chain,
    transport: http(),
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
  return balance ? balance.balance : "0";
}

export function useWalletBalance(tokenAddress: Address, chainId?: number) {
  const { address } = useAccount();
  const walletAddress = address as Address | undefined;
  const effectiveChainId = chainId || 5042002;
  return useQuery({
    queryKey: balanceKeys.wallet(effectiveChainId, tokenAddress, walletAddress || "0x"),
    queryFn: () =>
      fetchWalletBalance(effectiveChainId, tokenAddress, walletAddress as Address),
    enabled: !!walletAddress && !!tokenAddress,
    staleTime: 10000,
  });
}

export function useGatewayBalance(domainId: number) {
  const { address } = useAccount();
  const walletAddress = address as Address | undefined;
  return useQuery({
    queryKey: balanceKeys.gateway(domainId, walletAddress || "0x"),
    queryFn: () => fetchGatewayBalance(domainId, walletAddress as Address),
    enabled: !!walletAddress,
    staleTime: 10000,
  });
}

export function useInvalidateBalances() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

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
  const { address } = useAccount();
  const walletAddress = address as Address | undefined;
  const arcWallet = useWalletBalance(
    "0x3600000000000000000000000000000000000000" as Address,
    5042002
  );
  const arcGateway = useGatewayBalance(26);
  const baseGateway = useGatewayBalance(6);
  const ethGateway = useGatewayBalance(0);

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
