/**
 * BalanceSummary — compact per-chain Gateway balance display.
 *
 * Used by GatewayStatus (sidebar) and can be embedded anywhere.
 * Shows non-zero chains by default; collapses zero-balance ones
 * behind a "show N empty" toggle.
 *
 * Props:
 *   entries    — GatewayBalanceEntry[] from useGatewayBalances()
 *   isLoading  — show skeleton rows
 *   decimals   — how many decimal places to show (default 2 for summary,
 *                6 for precision contexts)
 *   showZero   — force-show all chains regardless of balance
 */
import { useState } from "react";
import { ChainIcon } from "./ChainIcon";
import type { GatewayBalanceEntry } from "../hooks/useGatewayBalances";

interface BalanceSummaryProps {
  entries: GatewayBalanceEntry[];
  isLoading?: boolean;
  decimals?: number;
  showZero?: boolean;
}

function SkeletonLine() {
  return (
    <div className="flex justify-between items-center py-1 animate-pulse">
      <div className="h-2.5 w-24 bg-[#241B14]" />
      <div className="h-2.5 w-16 bg-[#241B14]" />
    </div>
  );
}

export function BalanceSummary({
  entries,
  isLoading = false,
  decimals = 2,
  showZero = false,
}: BalanceSummaryProps) {
  const [showEmpty, setShowEmpty] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[1, 2, 3].map((i) => <SkeletonLine key={i} />)}
      </div>
    );
  }

  const nonZero = entries.filter((e) => e.balanceNum > 0);
  const zero    = entries.filter((e) => e.balanceNum === 0);
  const visible = showZero
    ? entries
    : showEmpty
      ? entries
      : nonZero;

  return (
    <div className="space-y-1 text-sm font-mono">
      {visible.length === 0 && (
        <p className="text-[#8C806D] text-xs py-1">No balances yet.</p>
      )}
      {visible.map((e) => (
        <div key={e.key} className="flex justify-between items-center py-0.5">
          <span className={`flex items-center gap-1.5 ${e.balanceNum > 0 ? "text-[#9C917E]" : "text-[#8C806D]"}`}>
            <ChainIcon iconKey={e.iconKey} size="sm" />
            {e.label}
          </span>
          <span className={e.balanceNum > 0 ? "text-[#EDE3D0]" : "text-[#8C806D]"}>
            {e.balanceNum.toFixed(decimals)} USDC
          </span>
        </div>
      ))}

      {!showZero && zero.length > 0 && (
        <button
          onClick={() => setShowEmpty((v) => !v)}
          className="text-[10px] font-mono text-[#8C806D] hover:text-[#EDE3D0] transition mt-0.5"
        >
          {showEmpty
            ? "— hide empty chains"
            : `+ ${zero.length} chain${zero.length !== 1 ? "s" : ""} empty`}
        </button>
      )}
    </div>
  );
}
