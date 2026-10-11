import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowDownToLine, ArrowRightLeft, Split, Copy, Check, RotateCw, Zap,
  ArrowRight, ChevronDown, ChevronUp, Download, Play,
} from "lucide-react";
import { useAccount } from "wagmi";
import { supabase } from "../lib/supabase";
import { relativeTime, truncateHash } from "../lib/formatTime";
import { chainConfig as testnetChainConfig } from "../config/gateway";
import { chainConfig as mainnetChainConfig } from "../config/gateway.mainnet";

type EventType = "gateway_deposit" | "gateway_fast_deposit" | "bridge_to_arc" | "batch_split";
type FilterType = "all" | "split" | "deposit" | "bridge" | "mainnet" | "testnet";

interface TxRecord {
  id: string;
  wallet_address: string;
  event_type: EventType;
  data: any;
  tx_hash: string;
  created_at: string;
}

/** Resolve network from data.network (current schema) with fallback for legacy rows. */
function resolveNetwork(record: TxRecord): "mainnet" | "testnet" {
  const n = record.data?.network;
  if (n === "mainnet" || n === "testnet") return n;
  // Legacy rows: infer from sourceChain label — mainnet labels have no "Sepolia"/"Fuji"/"Amoy"/"Testnet"
  const src: string = record.data?.sourceChain ?? record.data?.destinationChain ?? "";
  if (src && !/(sepolia|fuji|amoy|testnet)/i.test(src)) return "mainnet";
  return "testnet";
}

// ── Explorer URLs ──────────────────────────────────────────────────────────────
const ARC_TESTNET_EXPLORER = "https://testnet.arcscan.app";
const ARC_MAINNET_EXPLORER = "https://explorer.arc.io";

/** Search both chain configs for a matching label, return blockExplorerUrl. */
function findExplorerByLabel(label: string): string | null {
  const allConfigs = [
    ...Object.values(testnetChainConfig),
    ...Object.values(mainnetChainConfig),
  ];
  const match = allConfigs.find((c) => c.label === label);
  return match?.addParams?.blockExplorerUrls?.[0] ?? null;
}

function getExplorerUrl(record: TxRecord): string {
  const hash = record.tx_hash;
  if (!hash) return "";

  const isMainnet = resolveNetwork(record) === "mainnet";
  const arcExplorer = isMainnet ? ARC_MAINNET_EXPLORER : ARC_TESTNET_EXPLORER;

  // Deposits and bridges: use the source-chain explorer when resolvable
  if (
    record.event_type === "gateway_deposit" ||
    record.event_type === "gateway_fast_deposit" ||
    record.event_type === "bridge_to_arc"
  ) {
    const sourceLabel = record.data?.sourceChain;
    if (sourceLabel) {
      const explorerBase = findExplorerByLabel(sourceLabel);
      if (explorerBase) return `${explorerBase}/tx/${hash}`;
    }
  }

  return `${arcExplorer}/tx/${hash}`;
}

/** Returns a short label and color for the network badge. */
function networkBadge(record: TxRecord): { label: string; cls: string } {
  if (resolveNetwork(record) === "mainnet") {
    return { label: "MAINNET", cls: "text-[#F2B134] bg-[rgba(242,177,52,0.10)]" };
  }
  return { label: "TESTNET", cls: "text-[#8C806D] bg-[rgba(140,128,109,0.10)]" };
}

// ── Palette — on-theme, no blue/purple ────────────────────────────────────────
const EVENT_META: Record<EventType, { label: string; icon: React.ElementType; accent: string; bg: string }> = {
  gateway_deposit:      { label: "Deposit",      icon: ArrowDownToLine, accent: "#F2B134", bg: "rgba(242,177,52,0.10)" },
  gateway_fast_deposit: { label: "Fast Deposit", icon: Zap,             accent: "#4ADE80", bg: "rgba(74,222,128,0.10)" },
  bridge_to_arc:        { label: "Bridge",       icon: ArrowRightLeft,  accent: "#B8923F", bg: "rgba(184,146,63,0.10)" },
  batch_split:          { label: "Split",        icon: Split,           accent: "#EDE3D0", bg: "rgba(237,227,208,0.08)" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8C806D] hover:text-[#EDE3D0] transition"
      title="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function TxHashLink({ record }: { record: TxRecord }) {
  const hash = record.tx_hash;
  const transferId: string | undefined = record.data?.transferId;

  // Bridge rows: no on-chain hash — show transferId as a copyable reference instead
  if (!hash && transferId) {
    return (
      <span className="text-[11px] font-mono text-[#8C806D]" title={transferId}>
        id: {transferId.slice(0, 8)}…{transferId.slice(-6)}
      </span>
    );
  }

  if (!hash) return <span className="text-[11px] font-mono text-[#8C806D]">pending</span>;

  const url = getExplorerUrl(record);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] font-mono text-[#8C806D] hover:text-[#F2B134] transition underline-offset-2 hover:underline"
    >
      {truncateHash(hash)}
    </a>
  );
}

function RowSummary({ record }: { record: TxRecord }) {
  const { event_type, data } = record;
  const safe = (v: any) => (v !== undefined && v !== null ? Number(v) : 0);

  if (event_type === "gateway_deposit") {
    return (
      <p className="text-sm text-[#EDE3D0]">
        <span className="font-medium">{safe(data?.amount).toFixed(2)} USDC</span>{" "}
        deposited from <span className="text-[#8C806D]">{data?.sourceChain || "Unknown"}</span>
      </p>
    );
  }
  if (event_type === "gateway_fast_deposit") {
    return (
      <p className="text-sm text-[#EDE3D0]">
        <span className="font-medium">{safe(data?.amount).toFixed(2)} USDC</span>{" "}
        fast deposited{" "}
        <span className="text-[#8C806D] inline-flex items-center gap-1">
          {data?.sourceChain || "?"} <ArrowRight size={11} /> {data?.destinationChain || "Arc"}
        </span>
        {data?.status && data.status !== "DONE" && (
          <span className="ml-2 text-xs font-mono text-[#8C806D]">({data.status})</span>
        )}
      </p>
    );
  }
  if (event_type === "bridge_to_arc") {
    return (
      <p className="text-sm text-[#EDE3D0]">
        <span className="font-medium">{safe(data?.amount).toFixed(2)} USDC</span>{" "}
        bridged{" "}
        <span className="text-[#8C806D] inline-flex items-center gap-1">
          {data?.sourceChain || "?"} <ArrowRight size={11} /> Arc
        </span>
      </p>
    );
  }
  // batch_split
  const recipients = data?.recipients?.length ?? 0;
  const failed = Array.isArray(data?.recipients)
    ? data.recipients.filter((r: { success?: boolean }) => r?.success === false).length : 0;
  const total = safe(data?.totalAmount);
  const symbol = data?.token?.symbol || "USDC";
  const fundingRaw = data?.fundingSource || "native";
  const funding =
    fundingRaw === "unified" ? "GATEWAY" :
    fundingRaw === "hybrid"  ? "MIXED"   :
    fundingRaw === "wallet"  ? "WALLET"  :
    fundingRaw.toUpperCase();
  return (
    <p className="text-sm text-[#EDE3D0]">
      <span className="font-medium">{recipients} recipient{recipients !== 1 ? "s" : ""}</span>
      {" · "}{total.toFixed(2)} {symbol}
      <span className="text-[#8C806D] text-xs uppercase tracking-wide ml-2">{funding}</span>
      {failed > 0 && <span className="text-[#C4553D] text-xs font-mono ml-2">· {failed} not sent</span>}
    </p>
  );
}

// ── Expandable recipient list for batch_split ──────────────────────────────────
function SplitExpandedDetail({ record, onRunAgain }: { record: TxRecord; onRunAgain: (recipients: { address: string; amount: string }[]) => void }) {
  const recipients: { address: string; amount: string; success?: boolean }[] = record.data?.recipients ?? [];
  if (recipients.length === 0) return null;

  const downloadCSV = () => {
    const rows = ["address,amount", ...recipients.map((r) => `${r.address},${r.amount}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `split-${record.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3 border-t border-[rgba(242,177,52,0.10)] pt-3 space-y-2">
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {recipients.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs font-mono py-0.5">
            <span className={r.success === false ? "text-[#C4553D]" : "text-[#8C806D]"}>
              {r.address.slice(0, 8)}…{r.address.slice(-6)}
            </span>
            <span className={r.success === false ? "text-[#C4553D]" : "text-[#F2B134]"}>
              {Number(r.amount).toFixed(2)} {record.data?.token?.symbol || "USDC"}
              {r.success === false && " ✕"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap pt-1">
        <button onClick={downloadCSV} className="btn-secondary text-[10px] py-1 px-3 flex items-center gap-1">
          <Download size={11} /> CSV receipt
        </button>
        <button
          onClick={() => onRunAgain(recipients.map((r) => ({ address: r.address, amount: r.amount })))}
          className="btn-secondary text-[10px] py-1 px-3 flex items-center gap-1"
        >
          <Play size={11} /> Run again
        </button>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 py-4 px-1 animate-pulse">
      <div className="w-8 h-8 bg-[#241B14]" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-3 w-1/4 bg-[#241B14]" />
        <div className="h-2.5 w-1/2 bg-[#1D1712]" />
      </div>
    </div>
  );
}

const PAGE_SIZE = 50;

const FILTER_TABS: { id: FilterType; label: string; group?: "type" | "network" }[] = [
  { id: "all",      label: "ALL",      group: "type"    },
  { id: "split",    label: "SPLITS",   group: "type"    },
  { id: "deposit",  label: "DEPOSITS", group: "type"    },
  { id: "bridge",   label: "BRIDGES",  group: "type"    },
  { id: "mainnet",  label: "MAINNET",  group: "network" },
  { id: "testnet",  label: "TESTNET",  group: "network" },
];

function matchesFilter(record: TxRecord, filter: FilterType): boolean {
  if (filter === "all")     return true;
  if (filter === "split")   return record.event_type === "batch_split";
  if (filter === "deposit") return record.event_type === "gateway_deposit" || record.event_type === "gateway_fast_deposit";
  if (filter === "bridge")  return record.event_type === "bridge_to_arc";
  if (filter === "mainnet") return resolveNetwork(record) === "mainnet";
  if (filter === "testnet") return resolveNetwork(record) === "testnet";
  return true;
}

export function History({ onRunAgain }: { onRunAgain?: (recipients: { address: string; amount: string }[]) => void } = {}) {
  const { address } = useAccount();
  const [records, setRecords] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async (pageIndex = 0, append = false) => {
    if (!address) return;
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("transaction_history")
      .select("*")
      .eq("wallet_address", address)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (!error && data) {
      setRecords((prev) => append ? [...prev, ...data as TxRecord[]] : data as TxRecord[]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [address]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    setLoadingMore(true);
    fetchHistory(next, true);
  };

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchHistory(0, false);
    if (!address) return;
    const channel = supabase
      .channel(`history-${address}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transaction_history", filter: `wallet_address=eq.${address}` },
        (payload) => {
          // Prepend new row; reset page to 0 so Load more is correct
          setRecords((prev) => [payload.new as TxRecord, ...prev]);
          setPage(0);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchHistory, address]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchHistory(0, false);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = records.filter((r) => matchesFilter(r, filter));

  return (
    <div className="panel w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="step-label mb-0.5">TRANSACTION LOG</p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#8C806D] hover:text-[#EDE3D0] transition"
        >
          <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
          refresh
        </button>
      </div>

      {/* Filter chips — type filters + network filters with divider */}
      <div className="flex gap-1.5 flex-wrap items-center mb-5">
        {FILTER_TABS.map((f, i) => {
          const prevGroup = FILTER_TABS[i - 1]?.group;
          const showDivider = i > 0 && f.group !== prevGroup;
          return (
            <React.Fragment key={f.id}>
              {showDivider && (
                <span className="w-px h-4 bg-[rgba(242,177,52,0.14)] self-center" />
              )}
              <button
                onClick={() => setFilter(f.id)}
                className={[
                  "font-mono text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border transition-colors",
                  filter === f.id
                    ? "border-[rgba(242,177,52,0.40)] text-[#F2B134] bg-[rgba(242,177,52,0.06)]"
                    : "border-[rgba(242,177,52,0.14)] text-[#8C806D] hover:text-[#EDE3D0] hover:border-[rgba(242,177,52,0.25)]",
                ].join(" ")}
              >
                {f.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[rgba(242,177,52,0.06)]">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
            <div className="w-10 h-10 bg-[#241B14] flex items-center justify-center">
              <Split size={18} className="text-[#8C806D]" />
            </div>
            <p className="text-sm text-[#8C806D]">No transactions yet</p>
            <p className="text-xs text-[#8C806D]/60">Your deposits, bridges, and splits will appear here.</p>
          </div>
        )}

        {!loading && filtered.map((record) => {
          const meta = EVENT_META[record.event_type];
          if (!meta) return null;
          const Icon = meta.icon;
          const isExpanded = expanded.has(record.id);
          const isSplit = record.event_type === "batch_split";
          const hasRecipients = isSplit && (record.data?.recipients?.length ?? 0) > 0;
          return (
            <div key={record.id} className="py-4 group">
              <div className="flex items-start gap-3">
                {/* Square icon tile */}
                <div
                  className="w-8 h-8 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: meta.bg }}
                >
                  <Icon size={15} style={{ color: meta.accent }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Type badge */}
                      <span
                        className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 shrink-0"
                        style={{ color: meta.accent, backgroundColor: meta.bg }}
                      >
                        {meta.label}
                      </span>
                      {/* Network badge */}
                      {(() => { const nb = networkBadge(record); return (
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 shrink-0 ${nb.cls}`}>
                          {nb.label}
                        </span>
                      ); })()}
                    </div>
                    <span className="text-[11px] font-mono text-[#8C806D] shrink-0">
                      {relativeTime(record.created_at)}
                    </span>
                  </div>

                  <div className="mt-1">
                    <RowSummary record={record} />
                  </div>

                  <div className="mt-1.5 flex items-center gap-2">
                    <TxHashLink record={record} />
                    {record.tx_hash
                      ? <CopyButton value={record.tx_hash} />
                      : record.data?.transferId
                        ? <CopyButton value={record.data.transferId} />
                        : null
                    }
                    {hasRecipients && (
                      <button
                        onClick={() => toggleExpanded(record.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8C806D] hover:text-[#F2B134] transition ml-auto"
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isExpanded ? "collapse" : `${record.data.recipients.length} recipients`}
                      </button>
                    )}
                  </div>

                  {isSplit && isExpanded && (
                    <SplitExpandedDetail
                      record={record}
                      onRunAgain={onRunAgain ?? (() => {})}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {!loading && hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="btn-secondary text-[11px] py-1.5 px-5"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
