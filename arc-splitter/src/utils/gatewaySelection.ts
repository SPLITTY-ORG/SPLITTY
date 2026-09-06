import { chainConfig } from "../config/gateway";

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

  if (chainConfig && typeof chainConfig === 'object') {
    const entries = Object.entries(chainConfig)
      .filter(([key, val]) => val && val.domainId !== undefined && val.domainId !== 26)
      .map(([key, val]) => ({
        key,
        domainId: val.domainId,
        label: val.label || key,
        balance: parseFloat(gatewayBalances.find(b => b.domain === val.domainId)?.balance || "0"),
        gasCost: GAS_COST_ESTIMATE[val.domainId] || 0.001,
      }));
    chains = entries;
  }

  // Fallback if chainConfig missing
  if (chains.length === 0) {
    const fallback = [
      { key: 'baseSepolia', domainId: 6, label: 'Base Sepolia', gasCost: 0.0005 },
      { key: 'ethereumSepolia', domainId: 0, label: 'Ethereum Sepolia', gasCost: 0.001 },
    ];
    chains = fallback.map(c => ({
      ...c,
      balance: parseFloat(gatewayBalances.find(b => b.domain === c.domainId)?.balance || "0"),
    }));
  }

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
