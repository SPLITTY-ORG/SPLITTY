import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { supabase } from "../lib/supabase";

type HistoryEntry = {
  id: string;
  event_type: "batch_split" | "gateway_deposit" | "gateway_split";
  data: any;
  tx_hash: string;
  created_at: string;
};

function timeAgo(dateString: string) {
  const now = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncateHash(hash: string) {
  return hash.slice(0, 8) + "…" + hash.slice(-6);
}

export function RecentActivitySidebar({ onViewAll }: { onViewAll: () => void }) {
  const { address } = useAccount();
  const [activities, setActivities] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    const fetchRecent = async () => {
      const { data, error } = await supabase
        .from("transaction_history")
        .select("*")
        .eq("wallet_address", address)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) {
        console.error(error);
      } else {
        setActivities(data || []);
      }
      setLoading(false);
    };
    fetchRecent();
  }, [address]);

  if (!address) return <div className="panel"><p className="text-[#9C917E]">Connect wallet to see activity.</p></div>;

  if (loading) return <div className="panel"><p className="text-[#9C917E]">Loading…</p></div>;

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3">
        <span className="terminal-label">Recent Activity</span>
        <button onClick={onViewAll} className="text-xs text-[#F2B134] hover:underline">
          View all
        </button>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-[#9C917E]">No recent transactions.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => {
            let label = "SPLIT";
            let detail = "";
            if (act.event_type === "batch_split") {
              const total = act.data?.totalAmount || "0";
              const count = act.data?.recipients?.length || 0;
              detail = `${count} recipients · ${total} USDC`;
            } else if (act.event_type === "gateway_deposit") {
              label = "DEPOSIT";
              detail = `Gateway top-up · ${act.data?.amount || "0"} USDC`;
            } else if (act.event_type === "gateway_split") {
              label = "GATEWAY";
              detail = `${act.data?.recipients?.length || 0} recipients · ${act.data?.totalAmount || "0"} USDC`;
            }
            return (
              <div key={act.id} className="flex items-center justify-between text-xs border-b border-[rgba(242,177,52,0.16)]/50 pb-1">
                <div>
                  <span className="text-[#F2B134] font-bold">{label}</span>
                  <span className="text-[#9C917E] ml-2">{detail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#9C917E]">{timeAgo(act.created_at)}</span>
                  <span className="font-mono text-[#9C917E]">{truncateHash(act.tx_hash)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
