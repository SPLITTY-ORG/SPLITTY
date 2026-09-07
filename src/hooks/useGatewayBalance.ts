import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { GATEWAY_API_BASE, chainConfig } from "../config/gateway";

type Balance = {
  domain: number;
  balance: string;
};

export function useGatewayBalance() {
  const { address } = useAccount();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const domains = Object.values(chainConfig).map((c) => c.domainId);
      const body = {
        token: "USDC",
        sources: domains.map((domain) => ({
          domain,
          depositor: address,
        })),
      };
      const res = await fetch(`${GATEWAY_API_BASE}/v1/balances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBalances(json.balances || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [address]);

  return { balances, loading, error, refetch: fetchBalances };
}
