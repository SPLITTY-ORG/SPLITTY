import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";

export function History() {
  const { address } = useAccount();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!address) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("transaction_history")
      .select("*")
      .eq("wallet_address", address)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Failed to load history");
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [address]);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Copied!");
  };

  if (loading) return <div className="panel text-center py-8 text-[#9C917E]">Loading history...</div>;

  if (transactions.length === 0) {
    return (
      <div className="panel text-center py-16">
        <p className="text-[#9C917E]">No transactions yet.</p>
        <p className="text-xs text-[#8A6A2C] mt-2">Splits, deposits, and bridges will appear here.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <span className="terminal-label">History</span>
        <button
          onClick={fetchHistory}
          className="text-xs text-[#F2B134] hover:underline"
        >
          ⟳ refresh
        </button>
      </div>

      <div className="space-y-4">
        {transactions.map((tx) => {
          const isDeposit = tx.event_type === "gateway_deposit";
          const isBridge = tx.event_type === "bridge_to_arc";
          const isSplit = tx.event_type === "batch_split";
          const data = tx.data || {};
          const time = new Date(tx.created_at).toLocaleString();

          return (
            <div key={tx.id} className="border-b border-[rgba(242,177,52,0.16)] pb-3 last:border-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {isDeposit && <span className="text-blue-400 font-mono text-xs">DEPOSIT</span>}
                    {isBridge && <span className="text-purple-400 font-mono text-xs">BRIDGE</span>}
                    {isSplit && <span className="text-amber font-mono text-xs">SPLIT</span>}
                    <span className="text-[#9C917E] text-xs">{time}</span>
                  </div>

                  {isDeposit && (
                    <>
                      <div className="text-sm font-mono text-[#EDE3D0]">
                        {parseFloat(data.amount || "0").toFixed(6)} USDC deposited on {data.sourceChain || "unknown"}
                      </div>
                      <div className="text-xs text-[#9C917E] font-mono">
                        Tx: {tx.tx_hash?.slice(0, 16)}…
                      </div>
                    </>
                  )}

                  {isBridge && (
                    <>
                      <div className="text-sm font-mono text-[#EDE3D0]">
                        {parseFloat(data.amount || "0").toFixed(6)} USDC bridged from {data.sourceChain || "unknown"} → Arc
                      </div>
                      <div className="text-xs text-[#9C917E] font-mono">
                        Transfer ID: {data.transferId?.slice(0, 16)}…
                      </div>
                    </>
                  )}

                  {isSplit && (
                    <>
                      <div className="text-sm font-mono text-[#EDE3D0]">
                        {data.recipients?.length || 0} recipients · {parseFloat(data.totalAmount || "0").toFixed(6)} {data.token?.symbol || "USDC"}
                      </div>
                      <div className="text-xs text-[#9C917E]">
                        Funding: <span className="font-mono">{data.fundingSource?.toUpperCase() || "NATIVE"}</span>
                        {data.nativeContribution && (
                          <span className="ml-2">Native: {parseFloat(data.nativeContribution).toFixed(6)}</span>
                        )}
                        {data.unifiedContribution && (
                          <span className="ml-2">Unified: {parseFloat(data.unifiedContribution).toFixed(6)}</span>
                        )}
                      </div>
                      <div className="text-xs text-[#9C917E] font-mono">
                        Tx: {tx.tx_hash?.slice(0, 16)}…
                      </div>
                    </>
                  )}
                </div>
                {tx.tx_hash && (
                  <button
                    onClick={() => copyHash(tx.tx_hash)}
                    className="text-[#9C917E] hover:text-[#EDE3D0] text-xs ml-2"
                  >
                    copy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
