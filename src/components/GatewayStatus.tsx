import { useGatewayBalance } from "../hooks/useBalances";
import { chainConfig } from "../config/gateway";
import { useInvalidateBalances } from "../hooks/useBalances";
import { RefreshCw } from "lucide-react";

export function GatewayStatus() {
  const { invalidateGateway } = useInvalidateBalances();

  const arc       = useGatewayBalance(chainConfig.arc.domainId);
  const base      = useGatewayBalance(chainConfig.baseSepolia.domainId);
  const eth       = useGatewayBalance(chainConfig.ethereumSepolia.domainId);
  const avalanche = useGatewayBalance(chainConfig.avalancheFuji.domainId);
  const polygon   = useGatewayBalance(chainConfig.polygonAmoy.domainId);

  const balances = [
    { key: "arc"             as const, domain: chainConfig.arc.domainId,             label: chainConfig.arc.label,             balance: arc.data },
    { key: "baseSepolia"     as const, domain: chainConfig.baseSepolia.domainId,     label: chainConfig.baseSepolia.label,     balance: base.data },
    { key: "ethereumSepolia" as const, domain: chainConfig.ethereumSepolia.domainId, label: chainConfig.ethereumSepolia.label, balance: eth.data },
    { key: "avalancheFuji"   as const, domain: chainConfig.avalancheFuji.domainId,   label: chainConfig.avalancheFuji.label,   balance: avalanche.data },
    { key: "polygonAmoy"     as const, domain: chainConfig.polygonAmoy.domainId,     label: chainConfig.polygonAmoy.label,     balance: polygon.data },
  ];

  const refresh = () => {
    balances.forEach(b => invalidateGateway(b.domain));
  };

  return (
    <div className="panel">
      <div className="flex justify-between items-center mb-2">
        <span className="terminal-label text-xs">GATEWAY</span>
        <button onClick={refresh} className="text-[#9C917E] hover:text-[#EDE3D0] text-xs transition">
          <RefreshCw size={12} className="inline-block mr-1" /> refresh
        </button>
      </div>
      <div className="space-y-1 text-sm font-mono">
        {balances.map((b) => {
          const amount = parseFloat(b.balance || "0");
          return (
            <div key={b.key} className="flex justify-between">
              <span className={amount > 0 ? "text-[#9C917E]" : "text-[#6B5F4F]"}>
                {b.label}
              </span>
              <span className={amount > 0 ? "text-[#EDE3D0]" : "text-[#6B5F4F]"}>
                {amount.toFixed(6)} USDC
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
