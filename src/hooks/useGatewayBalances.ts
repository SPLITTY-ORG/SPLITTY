/**
 * useGatewayBalances — consolidated hook for all Gateway chain balances.
 *
 * Replaces the repeated five-hook pattern in SplitForm, GatewayStatus, and
 * GatewayDashboard.  Still calls five useGatewayBalance slots (Rules of
 * Hooks) but exposes a clean array + derived total.
 */
import { useMemo } from "react";
import { useGatewayBalance } from "./useBalances";
import { chainConfig, GATEWAY_BALANCE_CHAIN_KEYS } from "../config/gateway.active";

export type GatewayBalanceEntry = {
  key: keyof typeof chainConfig;
  label: string;
  iconKey: string;
  domainId: number | null;
  balance: string;          // always a valid numeric string ≥ "0"
  balanceNum: number;
  isLoading: boolean;
};

function safeNum(v: unknown): number {
  if (typeof v !== "string" && typeof v !== "number") return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function useGatewayBalances() {
  const keys = GATEWAY_BALANCE_CHAIN_KEYS as readonly (keyof typeof chainConfig)[];

  // Always call exactly 5 slots — Rules of Hooks.
  const b0 = useGatewayBalance(keys[0] ? chainConfig[keys[0]]?.domainId ?? null : null);
  const b1 = useGatewayBalance(keys[1] ? chainConfig[keys[1]]?.domainId ?? null : null);
  const b2 = useGatewayBalance(keys[2] ? chainConfig[keys[2]]?.domainId ?? null : null);
  const b3 = useGatewayBalance(keys[3] ? chainConfig[keys[3]]?.domainId ?? null : null);
  const b4 = useGatewayBalance(keys[4] ? chainConfig[keys[4]]?.domainId ?? null : null);

  const hooks = [b0, b1, b2, b3, b4] as const;

  const entries: GatewayBalanceEntry[] = useMemo(() => {
    return keys.map((key, i) => {
      const cfg = chainConfig[key];
      const balanceNum = safeNum(hooks[i]?.data);
      return {
        key,
        label:     cfg?.label    ?? String(key),
        iconKey:   cfg?.iconKey  ?? String(key),
        domainId:  cfg?.domainId ?? null,
        balance:   String(balanceNum),
        balanceNum,
        isLoading: hooks[i]?.isLoading ?? false,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(","), b0.data, b1.data, b2.data, b3.data, b4.data,
      b0.isLoading, b1.isLoading, b2.isLoading, b3.isLoading, b4.isLoading]);

  const total       = useMemo(() => entries.reduce((s, e) => s + e.balanceNum, 0), [entries]);
  const isLoading   = hooks.some((h) => h?.isLoading);
  const nonZero     = useMemo(() => entries.filter((e) => e.balanceNum > 0),  [entries]);
  const zeroCount   = entries.length - nonZero.length;

  const refetchAll  = () => hooks.forEach((h) => h?.refetch?.());

  return { entries, nonZero, zeroCount, total, isLoading, refetchAll };
}
