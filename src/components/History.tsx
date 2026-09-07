import React, { useEffect, useState, useCallback } from "react";
import { ArrowDownToLine, ArrowRightLeft, Split, Copy, Check, RotateCw } from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "../lib/supabase";
import { relativeTime, truncateHash } from "../lib/formatTime";

type EventType = "gateway_deposit" | "bridge_to_arc" | "batch_split";

interface TxRecord {
  id: string;
  wallet_address: string;
  event_type: EventType;
  data: any;
  tx_hash: string;
  created_at: string;
}

const EVENT_META: Record<
  EventType,
  { label: string; icon: React.ElementType; accent: string; bg: string }
> = {
  gateway_deposit: { label: "Deposit", icon: ArrowDownToLine, accent: "#378ADD", bg: "rgba(55,138,221,0.1)" },
  bridge_to_arc: { label: "Bridge", icon: ArrowRightLeft, accent: "#a985e0", bg: "rgba(169,133,224,0.1)" },
  batch_split: { label: "Split", icon: Split, accent: "#f2b134", bg: "rgba(242,177,52,0.1)" },
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#9C917E] hover:text-[#EDE3D0] transition"
      title="Copy transaction hash"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied && <span className="text-[10px] text-[#6B5F4F]">copied</span>}
    </button>
  );
}

function TxHashLink({ hash }: { hash: string }) {
  if (!hash) return <span className="text-[11px] font-mono text-[#6B5F4F]">no hash</span>;
  const url = `https://testnet.arcscan.app/tx/${hash}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] font-mono text-[#9C917E] hover:text-[#EDE3D0] transition underline-offset-2 hover:underline"
    >
      {truncateHash(hash)}
    </a>
  );
}

function RowSummary({ record }: { record: TxRecord }) {
  const { event_type, data } = record;
  const safeAmount = (v: any) => (v !== undefined && v !== null ? Number(v) : 0);

  if (event_type === "gateway_deposit") {
    const amount = safeAmount(data?.amount);
    const source = data?.sourceChain || "Unknown chain";
    return (
      <p className="text-sm text-[#EDE3D0]">
        <span className="font-medium">{amount.toFixed(2)} USDC</span>{" "}
        deposited from <span className="text-[#9C917E]">{source}</span>
      </p>
    );
  }
  if (event_type === "bridge_to_arc") {
    const amount = safeAmount(data?.amount);
    const source = data?.sourceChain || "Unknown chain";
    return (
      <p className="text-sm text-[#EDE3D0]">
        <span className="font-medium">{amount.toFixed(2)} USDC</span>{" "}
        bridged <span className="text-[#9C917E]">{source} → Arc</span>
      </p>
    );
  }
  // batch_split
  const recipients = data?.recipients?.length ?? 0;
  // Rows written before per-recipient outcomes were recorded have no
  // success field, so only an explicit false counts as a failure.
  const failed = Array.isArray(data?.recipients)
    ? data.recipients.filter((r: { success?: boolean }) => r?.success === false).length
    : 0;
  const total = safeAmount(data?.totalAmount);
  const symbol = data?.token?.symbol || "USDC";
  const funding = data?.fundingSource || "native";
  return (
    <p className="text-sm text-[#EDE3D0]">
      <span className="font-medium">{recipients} recipient{recipients !== 1 ? "s" : ""}</span>{" "}
      · {total.toFixed(2)} {symbol}{" "}
      <span className="text-[#9C917E] text-xs uppercase tracking-wide ml-1">
        {funding}
      </span>
      {failed > 0 && (
        <span className="text-[#C4553D] text-xs font-mono ml-2">
          · {failed} not sent
        </span>
      )}
    </p>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-4 px-1 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-[#2a221a]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 bg-[#2a221a] rounded" />
        <div className="h-2.5 w-1/4 bg-[#211b14] rounded" />
      </div>
    </div>
  );
}

export function History() {
  const { address } = useAccount();
  const [records, setRecords] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!address) return;
    const { data, error } = await supabase
      .from("transaction_history")
      .select("*")
      .eq("wallet_address", address)
      .order("created_at", { ascending: false });

    if (!error && data) setRecords(data as TxRecord[]);
    setLoading(false);
    setRefreshing(false);
  }, [address]);

  useEffect(() => {
    setLoading(true);
    fetchHistory();
  }, [fetchHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  return (
    <div className="rounded-2xl border border-[rgba(242,177,52,0.12)] bg-[#1D1712] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(242,177,52,0.1)]">
        <h2 className="text-sm font-mono uppercase tracking-wider text-[#EDE3D0]">History</h2>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9C917E] hover:text-[#EDE3D0] transition"
        >
          <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
          refresh
        </button>
      </div>

      <div className="divide-y divide-[rgba(242,177,52,0.06)] px-5">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#2a221a] flex items-center justify-center">
              <Split size={18} className="text-[#6B5F4F]" />
            </div>
            <p className="text-sm text-[#9C917E]">No transactions yet</p>
            <p className="text-xs text-[#6B5F4F]">Your deposits, bridges, and splits will show up here.</p>
          </div>
        )}

        {!loading &&
          records.map((record) => {
            const meta = EVENT_META[record.event_type];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <div key={record.id} className="flex items-start gap-3 py-4 group">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: meta.bg }}
                >
                  <Icon size={15} style={{ color: meta.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color: meta.accent, backgroundColor: meta.bg }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-mono text-[#6B5F4F]">
                      {relativeTime(record.created_at)}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <RowSummary record={record} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <TxHashLink hash={record.tx_hash} />
                    <CopyButton value={record.tx_hash} />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
