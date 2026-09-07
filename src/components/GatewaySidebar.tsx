import { useGatewayBalance } from "../hooks/useBalances";
import { chainConfig } from "../config/gateway";

export function GatewaySidebar() {
  const arcGateway = useGatewayBalance(26);
  const baseGateway = useGatewayBalance(6);
  const ethGateway = useGatewayBalance(0);
  const gatewayBalances = [
    { domain: 26, balance: arcGateway.data },
    { domain: 6, balance: baseGateway.data },
    { domain: 0, balance: ethGateway.data },
  ];

  const getDisplayBalance = (b: string | undefined) =>
    b ? parseFloat(b).toFixed(6) : "0.000000";

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3">
        <span className="terminal-label">Gateway</span>
        <span className="text-xs text-[#9C917E]">// passive</span>
      </div>
      <div className="space-y-1">
        {gatewayBalances.map((b) => {
          const chainKey = Object.keys(chainConfig).find(
            k => chainConfig[k as keyof typeof chainConfig].domainId === b.domain
          ) || "unknown";
          return (
            <div key={b.domain} className="flex justify-between text-sm">
              <span className="text-[#9C917E]">{chainKey}</span>
              <span className="font-mono text-[#EDE3D0]">{getDisplayBalance(b.balance)} USDC</span>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="text-xs text-[#F2B134] hover:underline mt-2"
      >
        ⟳ refresh
      </button>
    </div>
  );
}
