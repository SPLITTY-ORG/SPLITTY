import { useGatewayBalance } from "../hooks/useBalances";
import { chainConfig } from "../config/gateway";
import { useInvalidateBalances } from "../hooks/useBalances";

export function GatewayStatus() {
  const { invalidateGateway } = useInvalidateBalances();
  const arc = useGatewayBalance(26);
  const base = useGatewayBalance(6);
  const eth = useGatewayBalance(0);

  const balances = [
    { domain: 26, label: "Arc", balance: arc.data },
    { domain: 6, label: "Base Sepolia", balance: base.data },
    { domain: 0, label: "Ethereum Sepolia", balance: eth.data },
  ];

  const refresh = () => {
    invalidateGateway(26);
    invalidateGateway(6);
    invalidateGateway(0);
  };

  return (
    <div className="panel">
      <div className="flex justify-between items-center mb-2">
        <span className="terminal-label text-xs">GATEWAY</span>
        <button onClick={refresh} className="text-[#9C917E] hover:text-[#EDE3D0] text-xs transition">
          ↻ refresh
        </button>
      </div>
      <div className="space-y-1 text-sm font-mono">
        {balances.map((b) => (
          <div key={b.domain} className="flex justify-between">
            <span className="text-[#9C917E]">{b.label}</span>
            <span className="text-[#EDE3D0]">{parseFloat(b.balance || "0").toFixed(6)} USDC</span>
          </div>
        ))}
      </div>
    </div>
  );
}
