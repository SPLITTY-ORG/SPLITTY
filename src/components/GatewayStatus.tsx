import { useGatewayBalance, useInvalidateBalances } from "../hooks/useBalances";
import { chainConfig, GATEWAY_BALANCE_CHAIN_KEYS } from "../config/gateway.active";
import { ChainIcon } from "./ChainIcon";
import { RefreshCw } from "lucide-react";

export function GatewayStatus() {
  const { invalidateGateway } = useInvalidateBalances();

  // Build one hook per balance chain — max 5 entries.
  const keys = GATEWAY_BALANCE_CHAIN_KEYS as readonly (keyof typeof chainConfig)[];
  const b0 = useGatewayBalance(keys[0] ? chainConfig[keys[0]]?.domainId ?? null : null);
  const b1 = useGatewayBalance(keys[1] ? chainConfig[keys[1]]?.domainId ?? null : null);
  const b2 = useGatewayBalance(keys[2] ? chainConfig[keys[2]]?.domainId ?? null : null);
  const b3 = useGatewayBalance(keys[3] ? chainConfig[keys[3]]?.domainId ?? null : null);
  const b4 = useGatewayBalance(keys[4] ? chainConfig[keys[4]]?.domainId ?? null : null);

  const hooks = [b0, b1, b2, b3, b4];

  const balances = keys.map((key, i) => ({
    key,
    domain: chainConfig[key]?.domainId ?? null,
    label: chainConfig[key]?.label ?? key,
    balance: hooks[i]?.data,
    refetch: hooks[i]?.refetch,
  }));

  const refresh = () => {
    balances.forEach((b) => {
      if (b.domain !== null) invalidateGateway(b.domain);
    });
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
            <div key={b.key} className="flex justify-between items-center">
              <span className={`flex items-center gap-1.5 ${amount > 0 ? "text-[#9C917E]" : "text-[#6B5F4F]"}`}>
                <ChainIcon iconKey={chainConfig[b.key].iconKey} size="sm" />
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
