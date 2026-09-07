import { useAccount, useReadContract } from "wagmi";
import { formatUnits, erc20Abi } from "viem";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export function BalanceDashboard() {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  return (
    <div className="panel">
      <h2 className="terminal-label mb-2">Balance</h2>
      <div className="text-4xl font-mono tabular-nums text-amber">
        {balance ? formatUnits(balance, 6) : "0.00"} USDC
      </div>
      <p className="text-sm text-cream-dim mt-2">Available on Arc Testnet</p>
    </div>
  );
}
