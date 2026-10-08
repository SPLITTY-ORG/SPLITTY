import { useGatewayBalances } from "../hooks/useGatewayBalances";
import { useInvalidateBalances } from "../hooks/useBalances";
import { BalanceSummary } from "./BalanceSummary";
import { RefreshCw } from "lucide-react";

export function GatewayStatus() {
  const { entries, total, isLoading, refetchAll } = useGatewayBalances();
  const { invalidateGateway } = useInvalidateBalances();

  const handleRefresh = () => {
    entries.forEach((e) => {
      if (e.domainId !== null) invalidateGateway(e.domainId);
    });
    refetchAll();
  };

  return (
    <div className="panel">
      <div className="flex justify-between items-center mb-2">
        <span className="terminal-label text-xs">GATEWAY</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#F2B134]">
            {total.toFixed(2)} USDC
          </span>
          <button
            onClick={handleRefresh}
            className="text-[#9C917E] hover:text-[#EDE3D0] text-xs transition"
            title="Refresh gateway balances"
          >
            <RefreshCw size={12} className="inline-block mr-1" />refresh
          </button>
        </div>
      </div>

      <BalanceSummary entries={entries} isLoading={isLoading} decimals={2} />
    </div>
  );
}
