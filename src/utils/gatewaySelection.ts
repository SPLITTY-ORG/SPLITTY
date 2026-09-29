import { chainConfig, IS_MAINNET, BRIDGE_SOURCE_CHAIN_KEYS } from "../config/gateway.active";

export interface GatewaySource {
  key: string;
  domainId: number;
  label: string;
  balance: number;
  gasCost?: number; // estimated in native token (e.g., ETH)
}

// Estimated gas costs in native token units (approximate)
const GAS_COST_ESTIMATE: Record<number, number> = {
  6: 0.0005,    // Base Sepolia
  0: 0.001,     // Ethereum Sepolia
  // add more as needed
};

/**
 * Select the best Gateway source for a given amount.
 * Prioritises: sufficient balance > lower gas cost > higher balance.
 */
export function getBestGatewaySource(
  amountNeeded: number,
  gatewayBalances: Array<{ domain: number; balance: string }>
): GatewaySource | null {
  // Build list of available chains from chainConfig or fallback
  let chains: GatewaySource[] = [];

  // Use only bridge source chains (excludes Arc itself, which is the destination)
  chains = (BRIDGE_SOURCE_CHAIN_KEYS as readonly string[]).map((key) => {
    const val = chainConfig[key as keyof typeof chainConfig];
    return {
      key,
      domainId: val.domainId as number,
      label: val.label,
      balance: parseFloat(gatewayBalances.find(b => b.domain === val.domainId)?.balance || "0"),
      gasCost: GAS_COST_ESTIMATE[val.domainId as number] ?? (IS_MAINNET ? 0.001 : 0.0005),
    };
  }).filter(c => c.domainId != null);

  // Filter out chains with zero or negative balance
  const positive = chains.filter(c => c.balance > 0);
  if (positive.length === 0) return null;

  // First, try to find chains that can cover the full amount
  const sufficient = positive.filter(c => c.balance >= amountNeeded);
  if (sufficient.length > 0) {
    // Among sufficient, pick the one with lowest gas cost, then highest balance
    sufficient.sort((a, b) => (a.gasCost || 0) - (b.gasCost || 0) || b.balance - a.balance);
    return sufficient[0];
  }

  // If none sufficient, pick the one with highest balance (will cause shortfall warning)
  positive.sort((a, b) => b.balance - a.balance);
  return positive[0];
}
