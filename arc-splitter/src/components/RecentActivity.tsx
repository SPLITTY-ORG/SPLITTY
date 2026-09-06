import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAccount } from "wagmi";

export function RecentActivity({ onViewAll }: { onViewAll?: () => void }) {
  const { address } = useAccount();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("transaction_history")
        .select("*")
        .eq("wallet_address", address)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error && data) setActivities(data);
      setLoading(false);
    };
    fetch();
  }, [address]);

  if (loading) return <div className="panel text-xs text-[#9C917E]">Loading...</div>;
  if (activities.length === 0) return <div className="panel text-xs text-[#9C917E]">No recent activity</div>;

  return (
    <div className="panel">
      <div className="flex justify-between items-center mb-2">
        <span className="terminal-label text-xs">RECENT ACTIVITY</span>
        <button onClick={onViewAll} className="text-[#9C917E] hover:text-[#EDE3D0] text-xs transition">
          View all
        </button>
      </div>
      <div className="space-y-2">
        {activities.map((tx) => {
          const isDeposit = tx.event_type === "gateway_deposit";
          const data = tx.data;
          const time = new Date(tx.created_at).toLocaleTimeString();

          if (isDeposit) {
            const amount = data?.amount || "0";
            const source = data?.sourceChain || "Unknown";
            return (
              <div key={tx.id} className="border-b border-[rgba(242,177,52,0.16)] pb-1 last:border-0">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-400 font-mono">DEPOSIT</span>
                  <span className="text-[#9C917E]">{time}</span>
                </div>
                <div className="text-xs font-mono text-[#EDE3D0]">
                  {parseFloat(amount).toFixed(6)} USDC from {source}
                </div>
                <div className="text-[#9C917E] text-xs font-mono">
                  {tx.tx_hash?.slice(0, 10)}…
                </div>
              </div>
            );
          } else {
            // Split
            const total = data?.totalAmount || "0";
            const count = data?.recipients?.length || 0;
            const funding = data?.fundingSource || "native";
            return (
              <div key={tx.id} className="border-b border-[rgba(242,177,52,0.16)] pb-1 last:border-0">
                <div className="flex justify-between text-xs">
                  <span className="text-amber font-mono">SPLIT</span>
                  <span className="text-[#9C917E]">{time}</span>
                </div>
                <div className="text-xs font-mono text-[#EDE3D0]">
                  {count} recipients · {parseFloat(total).toFixed(6)} USDC
                  <span className="text-[#9C917E] ml-2">({funding.toUpperCase()})</span>
                </div>
                <div className="text-[#9C917E] text-xs font-mono">
                  {tx.tx_hash?.slice(0, 10)}…
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
