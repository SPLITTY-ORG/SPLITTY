import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { parse as parseCSV } from "csv-parse/sync";
import {
  isAddress,
  getAddress,
  formatUnits,
  parseUnits,
  createPublicClient,
  http,
  type Address,
} from "viem";

import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useSwitchChain,
  useSignTypedData,
  useReadContract,
  usePublicClient,
  useConfig,
} from "wagmi";

import toast from "react-hot-toast";
import { useWallets } from "@privy-io/react-auth";

import {
  Trash2,
  Plus,
  RotateCcw,
  ArrowRight,
  CheckCircle,
  Check,
  X,
  Send,
  Link,
  ArrowDownToLine,
  ArrowRightLeft,
  Coins,
  Split,
  Send as SendIcon,
  Banknote,
  FileSpreadsheet,
  Clipboard,
  Folder,
  Save,
  Users,
  Receipt,
  LoaderCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { ChainIcon } from "./ChainIcon";

import {
  toastSuccess,
  toastError,
  toastLoading,
  toastInfo,
} from "../lib/toast";

import {
  FORWARDER_ADDRESS,
  forwarderAbi,
  buildTransferCalls,
} from "../utils/multicall";

import { splitEqually } from "../utils/splitMath";

import {
  decodeTransfers,
  resolveOutcomes,
  type RecipientOutcome,
} from "../utils/transferOutcomes";

import { exceedsTokenPrecision } from "../utils/amountPrecision";
import { supabase } from "../lib/supabase";
import { chainConfig, IS_MAINNET, GATEWAY_BALANCE_CHAIN_KEYS, GATEWAY_ENV } from "../config/gateway.active";
import { bridgeToArc, pollTransferStatus } from "../utils/gatewayBridge";
import { useSound } from "../hooks/useSound";
import { useChainSwitch } from "../hooks/useChainSwitch";

import {
  useWalletBalance,
  useInvalidateBalances,
  useGatewayBalance,
} from "../hooks/useBalances";

import { getBestGatewaySource } from "../utils/gatewaySelection";
import { UnifiedBalanceKit } from "@circle-fin/unified-balance-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

type Recipient = {
  address: string;
  amount: string;
};

type FormValues = {
  tokenAddress: string;
  splitMode: "equal" | "custom";
  totalAmount: string;
  recipients: Recipient[];
  listName: string;
};

type SavedList = {
  id: string;
  list_name: string;
  recipients: Recipient[];
};

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
const USDC_DECIMALS = 6;

// SplittyBatcher contract — handles ERC-20 batch transfers for custom tokens.
// Testnet: chain ID 5042002 — Mainnet: chain ID 5042
const CUSTOM_TOKEN_BATCHER = (
  IS_MAINNET
    ? "0x941E49c0cF2F76Cc4f79D9fd1E4A892893e90032"
    : "0x5b09dB6bC8085032aC2E63ADa99de0d4c8F414c3"
) as Address;

const CUSTOM_TOKEN_BATCHER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      {
        components: [
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        internalType: "struct SplittyBatcher.Transfer[]",
        name: "transfers",
        type: "tuple[]",
      },
    ],
    name: "batchTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    stateMutability: "view",
    type: "function",
    outputs: [{ type: "uint256" }],
  },
  {
    inputs: [],
    name: "decimals",
    stateMutability: "view",
    type: "function",
    outputs: [{ type: "uint8" }],
  },
  {
    inputs: [],
    name: "symbol",
    stateMutability: "view",
    type: "function",
    outputs: [{ type: "string" }],
  },
  {
    inputs: [],
    name: "name",
    stateMutability: "view",
    type: "function",
    outputs: [{ type: "string" }],
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    stateMutability: "view",
    type: "function",
    outputs: [{ type: "uint256" }],
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    stateMutability: "nonpayable",
    type: "function",
    outputs: [{ type: "bool" }],
  },
] as const;

// ─── Circle Gateway chain identifiers ────────────────────────────────────────
// Circle's Unified Balance Kit expects exact-case strings for supported chains.
// Testnet values use "Name_Testnet" / "Name_Sepolia" format.
// Mainnet values use capitalized names like "Base", "Ethereum", "Arc".
// See: https://developers.circle.com/gateway/references/supported-blockchains
const CHAIN_IDENTIFIERS_TESTNET: Record<string, string> = {
  arc: "Arc_Testnet",
  baseSepolia: "Base_Sepolia",
  ethereumSepolia: "Ethereum_Sepolia",
  avalancheFuji: "Avalanche_Fuji",
  polygonAmoy: "Polygon_Amoy_Testnet",
  opSepolia: "Optimism_Sepolia",
};

const CHAIN_IDENTIFIERS_MAINNET: Record<string, string> = {
  arc: "Arc",
  base: "Base",
  ethereum: "Ethereum",
  avalanche: "Avalanche",
  polygon: "Polygon",
  op: "Optimism",
};

// ── In-style confirm modal ───────────────────────────────────────────────────
interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}
function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-[#1D1712] border border-[rgba(242,177,52,0.22)] max-w-sm w-full p-5">
        <p className="text-sm text-[#EDE3D0] leading-relaxed mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-xs py-1.5 px-4">Cancel</button>
          <button onClick={onConfirm} className="btn-primary text-xs py-1.5 px-4">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── ReviewModal ───────────────────────────────────────────────────────────────
interface ReviewModalProps {
  pendingData: { recipients: { address: string; amount: string }[] };
  tokenSymbol: string;
  activeDecimals: number;
  validRecipientsCount: number;
  getTotalToSend: () => number;
  fundingSource: string;
  nativeContribution: number;
  unifiedContribution: number;
  isCustomToken: boolean;
  arcSwitch: { isMismatched: boolean };
  isLoading: boolean;
  isReviewConfirmDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function ReviewModal({
  pendingData, tokenSymbol, activeDecimals, validRecipientsCount,
  getTotalToSend, fundingSource, nativeContribution, unifiedContribution,
  isCustomToken, arcSwitch, isLoading, isReviewConfirmDisabled,
  onCancel, onConfirm,
}: ReviewModalProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const copyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  const valid = pendingData.recipients.filter(r => r.address.trim() && r.amount.trim());

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1D1712] border border-[rgba(242,177,52,0.16)] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.20em] text-[#B8923F] mb-1">Review Split</h3>
        <div className="space-y-4">
          <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] p-4">
            {[
              ["Token", <span className="data-value font-bold text-amber">{tokenSymbol}</span>],
              ["Recipients", <span className="data-value font-bold">{validRecipientsCount}</span>],
              ["Total", <span className="data-value font-bold text-amber">{getTotalToSend().toFixed(Math.min(activeDecimals, 6))} {tokenSymbol}</span>],
              ["Funding", <span className="data-value">{fundingSource === "unified" ? "GATEWAY BALANCE" : fundingSource === "hybrid" ? "NATIVE/GATEWAY" : fundingSource.toUpperCase()}</span>],
              ...(fundingSource !== "native" ? [
                ["Native", <span className="data-value">{nativeContribution.toFixed(activeDecimals)} {tokenSymbol}</span>],
                ["Gateway Balance", <span className="data-value">{unifiedContribution.toFixed(activeDecimals)} {tokenSymbol}</span>],
              ] : []),
              ["Network", <span className="data-value">Arc</span>],
            ].map(([label, value], i) => (
              <div key={i} className="flex justify-between text-sm mt-2 first:mt-0">
                <span className="field-label">{label as string}</span>
                {value as React.ReactNode}
              </div>
            ))}

            {/* Execution details toggle */}
            <div className="mt-3 pt-3 border-t border-[rgba(242,177,52,0.10)]">
              <button
                onClick={() => setDetailsOpen(o => !o)}
                className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[#8C806D] hover:text-[#EDE3D0] transition"
              >
                {detailsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                Technical details
              </button>
              {detailsOpen && (
                <div className="mt-2 text-xs font-mono text-[#8C806D] space-y-1">
                  <div>Execution: <span className="text-[#EDE3D0]">{isCustomToken ? "SplittyBatcher" : "Multicall3From"}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Recipients list with copyable full addresses */}
          <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] p-4 max-h-60 overflow-y-auto">
            <p className="field-label mb-2">Recipients ({valid.length})</p>
            {valid.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-[rgba(242,177,52,0.08)] last:border-0">
                <button
                  onClick={() => copyAddr(r.address)}
                  title={r.address}
                  className="receipt-address text-left hover:text-[#EDE3D0] transition flex items-center gap-1.5"
                >
                  {r.address.slice(0, 8)}…{r.address.slice(-6)}
                  {copiedAddr === r.address
                    ? <Check size={10} className="text-[#4ADE80]" />
                    : <Copy size={10} className="opacity-40" />}
                </button>
                <span className="receipt-amount shrink-0">{r.amount} {tokenSymbol}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 btn-secondary">Cancel</button>
            <button
              onClick={onConfirm}
              disabled={isReviewConfirmDisabled}
              className={`flex-1 btn-primary inline-flex items-center justify-center gap-1.5 ${isReviewConfirmDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {arcSwitch.isMismatched ? "Switch to Arc" : isLoading ? "Processing…" : (
                <><CheckCircle size={14} /> Confirm &amp; Send</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type FundingSource = "native" | "unified" | "hybrid";
type Status = "idle" | "building" | "funding" | "confirming" | "broadcasting" | "confirmed" | "partial" | "failed";

interface SplitFormProps {
  onGoToFundGateway?: () => void;
  runAgainRecipients?: { address: string; amount: string }[] | null;
  onRunAgainConsumed?: () => void;
}

export function SplitForm({ onGoToFundGateway, runAgainRecipients, onRunAgainConsumed }: SplitFormProps) {
  const [csvError, setCsvError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showConfirm = useCallback((message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  }, []);
  const [isEqualMode, setIsEqualMode] = useState(false); // default to CUSTOM
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<Address | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [isSavingList, setIsSavingList] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeProgress, setBridgeProgress] = useState("");
  const [pendingBridge, setPendingBridge] = useState<{
    transferId: string;
    reason: "timeout" | "stopped";
  } | null>(null);
  const bridgeAbortRef = useRef<AbortController | null>(null);
  const [networkStatus, setNetworkStatus] = useState("");
  const [isCustomToken, setIsCustomToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("USDC");
  const [tokenDecimals, setTokenDecimals] = useState<number>(USDC_DECIMALS);
  const [tokenName, setTokenName] = useState("USD Coin");
  const [isLoadingTokenMeta, setIsLoadingTokenMeta] = useState(false);
  const [fundingSource, setFundingSource] = useState<FundingSource>("native");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [txLabel, setTxLabel] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [failedRecipients, setFailedRecipients] = useState<RecipientOutcome[]>([]);
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);
  const [showAllRecipients, setShowAllRecipients] = useState(false);
  const [gatewayAdvancedOpen, setGatewayAdvancedOpen] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedListSelectRef = useRef<HTMLSelectElement>(null);
  const historySavedRef = useRef(false);

  const { address, chainId } = useAccount();
  const { wallets } = useWallets();
  const { switchChainAsync } = useSwitchChain();

  const walletSession =
    typeof window !== "undefined"
      ? window.localStorage.getItem("splitty-wallet-session")
      : null;

  const embeddedWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === "privy" ||
      wallet.walletClientType === "privy-v2"
  );

  const externalWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType !== "privy" &&
      wallet.walletClientType !== "privy-v2"
  );

  const displayWallet =
    walletSession === "privy"
      ? embeddedWallet ?? externalWallet
      : walletSession === "external"
        ? externalWallet ?? embeddedWallet
        : externalWallet ?? embeddedWallet;

  const displayAddress = displayWallet?.address ?? address;
  const { signTypedDataAsync } = useSignTypedData();
  const { play } = useSound();
  const { invalidateWallet, invalidateGateway } = useInvalidateBalances();

  const arcSwitch = useChainSwitch("arc");
  const baseSwitch = useChainSwitch(IS_MAINNET ? "base" : "baseSepolia");
  const ethSwitch = useChainSwitch(IS_MAINNET ? "ethereum" : "ethereumSepolia");
  const [gatewaySourceChain, setGatewaySourceChain] = useState<keyof typeof chainConfig | null>(null);
  const bridgeSwitch = useChainSwitch(gatewaySourceChain || "arc");

  // Read token metadata if custom token address is valid
  const { data: fetchedDecimals, refetch: refetchDecimals } = useReadContract({
    address: isCustomToken && isAddress(customTokenAddress) ? (customTokenAddress as Address) : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  const { data: fetchedSymbol, refetch: refetchSymbol } = useReadContract({
    address: isCustomToken && isAddress(customTokenAddress) ? (customTokenAddress as Address) : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
  });
  const { data: fetchedName, refetch: refetchName } = useReadContract({
    address: isCustomToken && isAddress(customTokenAddress) ? (customTokenAddress as Address) : undefined,
    abi: ERC20_ABI,
    functionName: "name",
  });

  useEffect(() => {
    if (fetchedDecimals !== undefined || fetchedSymbol || fetchedName) {
      if (fetchedDecimals !== undefined) setTokenDecimals(Number(fetchedDecimals));
      if (fetchedSymbol) setTokenSymbol(fetchedSymbol);
      if (fetchedName) setTokenName(fetchedName);
      setIsLoadingTokenMeta(false);
    }
  }, [fetchedDecimals, fetchedSymbol, fetchedName]);

  const activeTokenAddress = isCustomToken && isAddress(customTokenAddress)
    ? customTokenAddress as Address
    : USDC_ADDRESS;
  const activeDecimals = isCustomToken ? tokenDecimals : USDC_DECIMALS;

  const chainIdForBalance = chainId ?? (IS_MAINNET ? 5042 : 5042002);
  const selectedChainConfig = Object.values(chainConfig).find(
    (config) => config.chainId === chainIdForBalance
  );
  const selectedUSDCAddress = selectedChainConfig?.usdcAddress ?? USDC_ADDRESS;

  const { data: balanceRaw, refetch: refetchBalance, isLoading: isBalanceLoading } = useWalletBalance(
    activeTokenAddress,
    chainIdForBalance
  );
  const tokenBalance = balanceRaw ? BigInt(balanceRaw) : undefined;

  const { data: usdcBalanceRaw } = useWalletBalance(
    selectedUSDCAddress,
    chainIdForBalance
  );

  const { data: nativeBalance } = useBalance({
    address: address,
  });

  // Gateway balance hooks — one per entry in GATEWAY_BALANCE_CHAIN_KEYS (max 5).
  // Hooks must be called unconditionally (Rules of Hooks), so we always call 5 slots.
  const gwBalKeys = GATEWAY_BALANCE_CHAIN_KEYS as readonly (keyof typeof chainConfig)[];
  const gwBal0 = useGatewayBalance(gwBalKeys[0] ? chainConfig[gwBalKeys[0]]?.domainId ?? null : null);
  const gwBal1 = useGatewayBalance(gwBalKeys[1] ? chainConfig[gwBalKeys[1]]?.domainId ?? null : null);
  const gwBal2 = useGatewayBalance(gwBalKeys[2] ? chainConfig[gwBalKeys[2]]?.domainId ?? null : null);
  const gwBal3 = useGatewayBalance(gwBalKeys[3] ? chainConfig[gwBalKeys[3]]?.domainId ?? null : null);
  const gwBal4 = useGatewayBalance(gwBalKeys[4] ? chainConfig[gwBalKeys[4]]?.domainId ?? null : null);
  const gwBalHooks = [gwBal0, gwBal1, gwBal2, gwBal3, gwBal4];

  const normalizeGatewayBalance = (value: unknown): string => {
    if (typeof value !== "string" && typeof value !== "number") return "0";
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : "0";
  };

  const gatewayBalances = gwBalKeys.map((key, i) => ({
    key,
    domain: chainConfig[key]?.domainId ?? null,
    balance: normalizeGatewayBalance(gwBalHooks[i]?.data),
  }));

  type GatewayFundingChain = (typeof gwBalKeys)[number];

  const [selectedGatewaySources, setSelectedGatewaySources] = useState<GatewayFundingChain[]>(
    [...gwBalKeys]
  );

  const toggleGatewaySource = (key: GatewayFundingChain) => {
    setSelectedGatewaySources((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const publicClient = usePublicClient();
  const config = useConfig();

  const {
    writeContract,
    writeContractAsync,
    data: writeData,
    isPending,
    error,
    reset: resetWrite,
  } = useWriteContract();

  const {
    writeContractAsync: writeApprovalContractAsync,
  } = useWriteContract();

  const { isLoading: isWaiting, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // ---------- Saved Lists ----------
  const fetchSavedLists = async () => {
    if (!address) return;
    setLoadingLists(true);
    const { data, error } = await supabase
      .from("saved_recipient_lists")
      .select("*")
      .eq("wallet_address", address)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toastError("Failed to load saved lists.");
    } else {
      setSavedLists(data || []);
    }
    setLoadingLists(false);
  };

  useEffect(() => {
    if (!address) return;
    let isMounted = true;
    const load = async () => {
      setLoadingLists(true);
      const { data, error } = await supabase
        .from("saved_recipient_lists")
        .select("*")
        .eq("wallet_address", address)
        .order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) {
        console.error(error);
        toastError("Failed to load saved lists.");
      } else {
        setSavedLists(data || []);
      }
      setLoadingLists(false);
    };
    load();
    return () => { isMounted = false; };
  }, [address]);

  const loadList = (listId: string) => {
    const list = savedLists.find(l => l.id === listId);
    if (!list) return;
    const hasUnsavedWork = recipients.some(r => r.address.trim() || r.amount.trim());
    if (hasUnsavedWork) {
      setConfirmModal({
        message: `Load "${list.list_name}"? This will replace the recipients currently in the form.`,
        onConfirm: () => {
          setConfirmModal(null);
          _doLoadList(list);
        },
      });
      return;
    }
    _doLoadList(list);
  };

  const _doLoadList = (list: SavedList) => {
    setPendingData(null);
    setShowReview(false);
    setStatus("idle");
    setStatusMessage("");
    setTxLabel("");
    setTxError(null);
    setTxHash(null);
    setBridgeTxHash(null);
    setIsSubmitting(false);
    setFailedRecipients([]);
    setPendingBridge(null);
    resetWrite();
    setValue("recipients", list.recipients);
    toastSuccess(`Loaded "${list.list_name}"`);
    play("click");
  };

  const saveCurrentList = async () => {
    const listName = watch("listName").trim();
    if (!listName) {
      toastError("Please enter a name for the list");
      return;
    }
    const currentRecipients = watch("recipients").filter(r => r.address.trim() && r.amount.trim());
    if (currentRecipients.length === 0) {
      toastError("No recipients to save");
      return;
    }
    setIsSavingList(true);
    const existing = savedLists.find(l => l.list_name === listName);
    if (existing) {
      setIsSavingList(false);
      setConfirmModal({
        message: `A list named "${listName}" already exists. Overwrite it?`,
        onConfirm: async () => {
          setConfirmModal(null);
          setIsSavingList(true);
          await _doSaveList(existing.id, null, currentRecipients, listName);
        },
      });
      return;
    }
    await _doSaveList(null, address, currentRecipients, listName);
    setIsSavingList(false);
  };

  const _doSaveList = async (
    existingId: string | null,
    walletAddress: string | undefined,
    currentRecipients: Recipient[],
    listName: string,
  ) => {
    setIsSavingList(true);
    const { error } = existingId !== null
      ? await supabase
          .from("saved_recipient_lists")
          .update({ recipients: currentRecipients })
          .eq("id", existingId)
      : await supabase
          .from("saved_recipient_lists")
          .insert({
            wallet_address: walletAddress,
            list_name: listName,
            recipients: currentRecipients,
          });
    setIsSavingList(false);
    if (error) {
      console.error(error);
      toastError("Failed to save list.");
    } else {
      toastSuccess(`List "${listName}" saved!`);
      setValue("listName", "");
      fetchSavedLists();
      play("click");
    }
  };

  const deleteList = async (listId: string) => {
    const { error } = await supabase
      .from("saved_recipient_lists")
      .delete()
      .eq("id", listId);
    if (error) {
      console.error(error);
      toastError("Failed to delete list.");
    } else {
      toastSuccess("List deleted.");
      fetchSavedLists();
      play("click");
    }
  };

  // ---------- Reset after transaction ----------
  const resetAfterTransaction = () => {
    setPendingData(null);
    setTxHash(null);
    setStatus("idle");
    setStatusMessage("");
    setTxLabel("");
    setTxError(null);
    setBridgeTxHash(null);
    setIsSubmitting(false);
    setShowReview(false);
    setShowAllRecipients(false);
    setValue("recipients", [{ address: "", amount: "" }]);
    setValue("totalAmount", "");
    if (savedListSelectRef.current) {
      savedListSelectRef.current.value = "";
    }
  };

  // ---------- History ----------
  useEffect(() => {
    if (isSuccess && receipt && pendingData && address && !historySavedRef.current) {
      historySavedRef.current = true;
      const saveHistory = async () => {
        setSavingHistory(true);
        try {
          const recipientsWithStatus = resolveOutcomes(
            decodeTransfers(receipt.logs, activeTokenAddress),
            pendingData.recipients.filter(r => r.address.trim() && r.amount.trim())
          );

          const totalAmountWei = recipientsWithStatus.reduce((sum, r) => {
            const parsed = parseUnits(r.amount, activeDecimals);
            return sum + parsed;
          }, 0n);

          const totalNeededNum = parseFloat(formatUnits(totalAmountWei, activeDecimals));
          const nativeContributionNum = getNativeContributionForHistory(totalNeededNum);
          const unifiedContributionNum = getUnifiedContributionForHistory(totalNeededNum);

          const { error: dbError } = await supabase
            .from("transaction_history")
            .insert({
              wallet_address: address,
              event_type: "batch_split",
              data: {
                totalAmount: formatUnits(totalAmountWei, activeDecimals),
                recipients: recipientsWithStatus,
                token: {
                  address: activeTokenAddress,
                  symbol: tokenSymbol,
                  decimals: activeDecimals,
                },
                fundingSource: isCustomToken ? "wallet" : fundingSource,
                nativeContribution: nativeContributionNum.toFixed(activeDecimals),
                unifiedContribution: unifiedContributionNum.toFixed(activeDecimals),
              },
              tx_hash: receipt.transactionHash,
            });

          if (dbError) {
            console.error(dbError);
            toastError("Transaction succeeded, but failed to save history.");
          } else {
            toastSuccess("History saved!");
            play("success");
            invalidateWallet(chainId ?? (IS_MAINNET ? 5042 : 5042002), activeTokenAddress);
            if (activeTokenAddress === USDC_ADDRESS) {
              const arcDomainId = (chainConfig as any).arc?.domainId ?? null;
              if (arcDomainId !== null) invalidateGateway(arcDomainId);
            }
            // Keep the list on screen after a partial send, otherwise the
            // failed recipients are wiped before anyone can act on them.
            if (recipientsWithStatus.every(r => r.success)) {
              setTimeout(resetAfterTransaction, 2000);
            }
          }
        } catch (err) {
          console.error(err);
          toastError("Error saving transaction history.");
        } finally {
          setSavingHistory(false);
        }
      };
      saveHistory();
    }
  }, [isSuccess, receipt, pendingData, address, activeTokenAddress, tokenSymbol, activeDecimals, fundingSource]);

  const getUserFacingTxError = (err: any): string => {
  const name = err?.name ?? "";
  const message = err?.shortMessage ?? err?.message ?? "";

  if (
    name === "UserRejectedRequestError" ||
    name === "TransactionRejectedRpcError" ||
    /user rejected|user denied|rejected|denied|cancelled|canceled/i.test(message)
  ) {
    return "Transaction cancelled.";
  }

  return "Transaction failed. Please try again.";
};

const getNativeContributionForHistory = (totalNeededNum: number) => {
    if (fundingSource === "native") return Math.min(totalNeededNum, nativeAvailable);
    if (fundingSource === "unified") return 0;
    if (fundingSource === "hybrid") return Math.min(totalNeededNum, nativeAvailable);
    return 0;
  };

  const getUnifiedContributionForHistory = (totalNeededNum: number) => {
    const nativeUsed = getNativeContributionForHistory(totalNeededNum);
    if (fundingSource === "native") return 0;
    if (fundingSource === "unified") return Math.min(totalNeededNum, unifiedAvailable);
    if (fundingSource === "hybrid") {
      const remaining = Math.max(0, totalNeededNum - nativeUsed);
      return Math.min(remaining, unifiedAvailable);
    }
    return 0;
  };

  // ---------- React Hook Form ----------
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      tokenAddress: USDC_ADDRESS,
      splitMode: "equal",
      totalAmount: "",
      recipients: [{ address: "", amount: "" }],
      listName: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "recipients",
  });

  const recipients = watch("recipients");
  const totalAmount = watch("totalAmount");
  const splitMode = watch("splitMode");

  // ---------- Run Again: pre-fill from History ----------
  useEffect(() => {
    if (!runAgainRecipients || runAgainRecipients.length === 0) return;
    setValue("recipients", runAgainRecipients.map((r) => ({ address: r.address, amount: r.amount })));
    setValue("totalAmount", "");
    setIsEqualMode(false);
    onRunAgainConsumed?.();
  }, [runAgainRecipients]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Equal mode distribution effect ----------
  useEffect(() => {
    if (!isEqualMode) return;
    const total = parseFloat(totalAmount);
    const filledIndexes = recipients
      .map((r, i) => ({ addr: r.address.trim(), i }))
      .filter(x => x.addr);
    if (!total || filledIndexes.length === 0) return;

    let shares: string[];
    try {
      shares = splitEqually(totalAmount.trim(), filledIndexes.length, activeDecimals);
    } catch {
      return; // still mid-typing, not a parseable amount yet
    }

    filledIndexes.forEach(({ i }, shareIndex) => {
      const each = shares[shareIndex];
      const current = watch(`recipients.${i}.amount`);
      if (current !== each) setValue(`recipients.${i}.amount`, each);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEqualMode, totalAmount, recipients.map(r => r.address).join(","), activeDecimals]);

  // ---------- Computed helpers ----------
  const validRecipientsCount = recipients.filter(r => r.address.trim() && r.amount.trim()).length;

  const getTotalToSend = () => {
    const valid = recipients.filter(r => r.address.trim() && r.amount.trim());
    if (valid.length === 0) return 0;
    return valid.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
  };

  const getEqualAmount = () => {
    const total = parseFloat(totalAmount);
    const count = recipients.filter(r => r.address.trim()).length;
    if (!total || count === 0) return "";
    return (total / count).toFixed(activeDecimals);
  };

  const clearAll = () => {
    if (recipients.length === 0) return;
    showConfirm("Remove all recipients?", () => {
      setValue("recipients", [{ address: "", amount: "" }]);
      play("click");
      setShowAllRecipients(false);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } } as any;
      handleCSVUpload(fakeEvent);
    }
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const records = parseCSV(content, { columns: true, skip_empty_lines: true, trim: true });
        const newRecipients: Recipient[] = [];
        const errors: string[] = [];
        records.forEach((row: any, index: number) => {
          const addr = row.address?.trim();
          const amt = row.amount?.trim();
          if (!addr || !isAddress(addr)) {
            errors.push(`Row ${index + 1}: Invalid address "${addr}"`);
            return;
          }
          if (!amt || isNaN(parseFloat(amt)) || parseFloat(amt) <= 0) {
            errors.push(`Row ${index + 1}: Invalid amount "${amt}"`);
            return;
          }
          // parseUnits rounds rather than truncates, so an amount with more
          // decimals than the token would be sent as a different number.
          if (exceedsTokenPrecision(amt, activeDecimals)) {
            errors.push(`Row ${index + 1}: "${amt}" has more than ${activeDecimals} decimal places`);
            return;
          }
          newRecipients.push({ address: getAddress(addr), amount: amt });
        });
        if (errors.length > 0) {
          setCsvError(errors.join(" | "));
          return;
        }
        setCsvError(null);
        setValue("recipients", newRecipients.map(r => ({ address: r.address, amount: r.amount })));
        toastSuccess(`Imported ${newRecipients.length} recipients from CSV`);
        play("click");
        setShowAllRecipients(false);
      } catch (err) {
        setCsvError("Failed to parse CSV. Make sure it has 'address,amount' columns.");
        toastError("CSV parsing failed");
      }
    };
    reader.readAsText(file);
  };

  const handleBulkPaste = () => {
    if (!bulkInput.trim()) {
      toastError(isEqualMode ? "Please paste some addresses" : "Please paste some addresses and amounts");
      return;
    }
    const lines = bulkInput.split("\n").filter((line) => line.trim());
    const newRecipients: Recipient[] = [];
    const errors: string[] = [];

    if (isEqualMode) {
      // Equal mode: each line is just an address (ignore any amount column)
      const equalAmt = getEqualAmount();
      lines.forEach((line, index) => {
        const addr = line.split(/[,\t]+/)[0].trim();
        if (!isAddress(addr)) {
          errors.push(`Line ${index + 1}: invalid address "${addr}"`);
          return;
        }
        newRecipients.push({ address: getAddress(addr), amount: equalAmt });
      });
    } else {
      // Custom mode: each line must be address,amount
      lines.forEach((line, index) => {
        const parts = line.split(/[,\t]+/).map((s) => s.trim());
        if (parts.length < 2) {
          errors.push(`Line ${index + 1}: missing amount`);
          return;
        }
        const addr = parts[0];
        const amt = parts[1];
        if (!isAddress(addr)) {
          errors.push(`Line ${index + 1}: invalid address "${addr}"`);
          return;
        }
        if (isNaN(parseFloat(amt)) || parseFloat(amt) <= 0) {
          errors.push(`Line ${index + 1}: invalid amount "${amt}"`);
          return;
        }
        if (exceedsTokenPrecision(amt, activeDecimals)) {
          errors.push(`Line ${index + 1}: "${amt}" has more than ${activeDecimals} decimal places`);
          return;
        }
        newRecipients.push({ address: getAddress(addr), amount: amt });
      });
    }

    if (errors.length > 0) {
      toastError(errors.join(" | "));
      return;
    }
    setValue("recipients", newRecipients);
    setBulkInput("");
    toastSuccess(`Added ${newRecipients.length} recipients from paste`);
    play("click");
    setShowAllRecipients(false);
  };

  // ---------- Compute balances ----------
  const totalNeeded = parseFloat(totalAmount || "0") || getTotalToSend();
  const nativeUSDCBalance = usdcBalanceRaw ? parseFloat(formatUnits(BigInt(usdcBalanceRaw), USDC_DECIMALS)) : 0;
  const nativeAvailable = tokenBalance ? parseFloat(formatUnits(tokenBalance, activeDecimals)) : 0;
  const selectedGatewayBalances = gatewayBalances.filter((b) =>
    selectedGatewaySources.includes(b.key)
  );

  // Ticked chains only — used to decide how much can actually be bridged.
  const unifiedAvailable = selectedGatewayBalances.reduce(
    (sum, b) => sum + parseFloat(b.balance || "0"),
    0
  );

  // Every chain, ticked or not — used for display totals.
  const unifiedTotal = gatewayBalances.reduce(
    (sum, b) => sum + parseFloat(b.balance || "0"),
    0
  );

  const totalUSDC = nativeUSDCBalance + unifiedTotal;

  const getNativeContribution = () => {
    if (fundingSource === "native") return Math.min(totalNeeded, nativeAvailable);
    if (fundingSource === "unified") return 0;
    if (fundingSource === "hybrid") {
      return Math.min(totalNeeded, nativeAvailable);
    }
    return 0;
  };

  const getUnifiedContribution = () => {
    const needed = totalNeeded;
    const nativeUsed = getNativeContribution();
    if (fundingSource === "native") return 0;
    if (fundingSource === "unified") return Math.min(needed, unifiedAvailable);
    if (fundingSource === "hybrid") {
      const remaining = Math.max(0, needed - nativeUsed);
      return Math.min(remaining, unifiedAvailable);
    }
    return 0;
  };

  const nativeContribution = getNativeContribution();
  const unifiedContribution = getUnifiedContribution();
  const isFullyFunded = (nativeContribution + unifiedContribution) >= totalNeeded;

  const needsBridge = (fundingSource === "unified" || fundingSource === "hybrid") && unifiedContribution > 0;

  // ---------- Gateway Funding + Split ----------
  const bridgeAndSplit = async () => {
    const bail = (msg: string) => {
      toastError(msg);
      setStatus("idle");
      setStatusMessage("");
      setIsSubmitting(false);
    };

    if (isCustomToken) {
      return bail("Gateway funding is only supported for USDC.");
    }

    if (!address) {
      return bail("Wallet not connected");
    }

    const amountToBridge = unifiedContribution;

    if (amountToBridge <= 0) {
      return bail("No Gateway contribution needed");
    }

    const selectedSources = gatewayBalances.filter(
      (b) =>
        selectedGatewaySources.includes(b.key) &&
        parseFloat(b.balance || "0") > 0
    );

    if (selectedSources.length === 0) {
      return bail("Select at least one Gateway balance to fund from.");
    }

    const selectedTotal = selectedSources.reduce(
      (sum, b) => sum + parseFloat(b.balance || "0"),
      0
    );

    if (selectedTotal < amountToBridge) {
      return bail(
        `Selected Gateway balances are insufficient (need ${amountToBridge.toFixed(
          6
        )}, have ${selectedTotal.toFixed(6)})`
      );
    }

    setIsBridging(true);
    setBridgeProgress("Preparing Gateway funding...");
    setNetworkStatus("Preparing Gateway funding...");

    try {
      const activeConnection = config.state.connections.get(
        config.state.current
      );

      const provider = await activeConnection?.connector.getProvider();

      if (!provider) {
        throw new Error("Unable to access the connected wallet provider.");
      }

      const adapter = await createViemAdapterFromProvider({
        provider,
        getPublicClient: ({ chain }) =>
          createPublicClient({
            chain,
            transport: http(chain.rpcUrls.default.http[0]),
          }),
      });

      const chainIdentifiers: Record<string, string> =
        IS_MAINNET ? CHAIN_IDENTIFIERS_MAINNET : CHAIN_IDENTIFIERS_TESTNET;

      let remaining = amountToBridge;

      const allocations = selectedSources
        .map((source) => {
          const available = parseFloat(source.balance || "0");
          const amount = Math.min(available, remaining);

          remaining -= amount;

          return {
            amount: amount.toFixed(6),
            chain: chainIdentifiers[source.key],
          };
        })
        .filter((allocation) => parseFloat(allocation.amount) > 0);

      if (remaining > 0.0000001) {
        throw new Error(
          `Unable to allocate the full Gateway amount. Remaining: ${remaining.toFixed(
            6
          )} USDC`
        );
      }

      setBridgeProgress(
        `Funding ${amountToBridge.toFixed(6)} USDC from ${
          allocations.length
        } Gateway balance${allocations.length === 1 ? "" : "s"}...`
      );
      setNetworkStatus("Funding Arc wallet...");

      const kit = new UnifiedBalanceKit({
        environment: GATEWAY_ENV,
        adapter,
      });

      const destinationChain = IS_MAINNET ? "Arc" : "Arc_Testnet";

      const spendParams = {
        from: {
          adapter,
          allocations,
        },
        to: {
          adapter,
          chain: destinationChain as any,
          recipientAddress: address,
          useForwarder: true,
        },
        amount: amountToBridge.toFixed(6),
        token: "USDC" as const,
      };

      const estimate = await kit.estimateSpend(spendParams);

      setBridgeProgress(
        "Confirm the Gateway funding transaction in your wallet..."
      );
      setNetworkStatus("Waiting for wallet confirmation...");

      const result = await kit.spend(spendParams);

      if (result.txHash) {
        setBridgeTxHash(result.txHash as Address);
      }

      setBridgeProgress(
        "Gateway funding submitted. Waiting for completion..."
      );
      setNetworkStatus("Waiting for Gateway funding...");

      await new Promise((resolve) => setTimeout(resolve, 5000));

      for (const source of selectedSources) {
        invalidateGateway(source.domain);
      }

      invalidateGateway(chainConfig.arc.domainId);
      invalidateWallet(IS_MAINNET ? 5042 : 5042002, USDC_ADDRESS);

      setNetworkStatus("Refreshing balance...");
      await refetchBalance();

      setBridgeProgress("Gateway funding complete. Executing split...");
      setNetworkStatus("Gateway funding complete");

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await executeSplitAfterBridge();
    } catch (err: any) {
      console.error("Gateway funding failed:", err);

      const message =
        err?.shortMessage ||
        err?.details ||
        err?.message ||
        "Gateway funding failed";

      toastError(message);
      setNetworkStatus(`Gateway funding failed: ${message}`);
      setStatus("failed");
      setStatusMessage(`Gateway funding failed: ${message}`);
      setIsSubmitting(false);
    } finally {
      setIsBridging(false);
      setBridgeProgress("");
    }
  };

  const executeSplitAfterBridge = async () => {
    if (!pendingData || !address) return;
    const valid = pendingData.recipients.filter(r => r.address.trim() && r.amount.trim());
    if (valid.length === 0) {
      toastError("No valid recipients");
      return;
    }
    const totalAmountWei = valid.reduce((sum, r) => {
      const parsed = parseUnits(r.amount, activeDecimals);
      return sum + parsed;
    }, 0n);

    const calls = buildTransferCalls(
      activeTokenAddress,
      address,
      valid,
      activeDecimals
    );

    setStatus("confirming");
    setStatusMessage("Confirming on chain...");
    play("confirm");

    try {
      await writeContract({
        address: FORWARDER_ADDRESS,
        abi: forwarderAbi,
        functionName: "aggregate3",
        args: [calls],
      });
      setStatus("broadcasting");
      setStatusMessage("Broadcasting...");
      play("await");
    } catch (err: any) {
      setStatus("failed");
      setStatusMessage(`Failed: ${err.message}`);
      play("error");
      toastError(err.message);
      setIsSubmitting(false);
    }
  };

  // ---------- Review ----------
  const onReview = (data: FormValues) => {
    const valid = data.recipients.filter(r => r.address.trim() && r.amount.trim());
    if (valid.length === 0) {
      toastError("Please add at least one valid recipient");
      return;
    }
    if (valid.length > 500) {
      toastError(`Too many recipients (${valid.length}). Max 500 per transaction to avoid hitting the gas limit.`);
      return;
    }
    if (valid.length > 200) {
      toastInfo(`Large batch: ${valid.length} recipients. Make sure you have enough gas.`);
    }

    // Check for duplicate addresses
    const seen = new Set<string>();
    const duplicates = valid.filter(r => {
      const addr = getAddress(r.address);
      if (seen.has(addr)) return true;
      seen.add(addr);
      return false;
    });
    if (duplicates.length > 0) {
      const duplicateList = duplicates.map(r => r.address.slice(0, 6) + "…" + r.address.slice(-4)).join(", ");
      toastError(`Duplicate address(es) found: ${duplicateList}. Please remove duplicates.`);
      return;
    }

    // Catches amounts typed directly into a row, which never pass through
    // the CSV or paste importers.
    const tooPrecise = valid.filter(r => exceedsTokenPrecision(r.amount, activeDecimals));
    if (tooPrecise.length > 0) {
      toastError(`${tooPrecise.length} amount(s) have more than ${activeDecimals} decimal places. ${tokenSymbol} cannot hold that precision, so they would be rounded up and send more than you entered.`);
      return;
    }

    const totalAmountWei = valid.reduce((sum, r) => {
      const parsed = parseUnits(r.amount, activeDecimals);
      return sum + parsed;
    }, 0n);
    if (totalAmountWei === 0n) {
      toastError("Total amount must be greater than 0");
      return;
    }

    const totalNeededNum = parseFloat(formatUnits(totalAmountWei, activeDecimals));
    if (fundingSource === "native" && nativeAvailable < totalNeededNum) {
      toastError(`Insufficient native balance (need ${totalNeededNum} ${tokenSymbol})`);
      return;
    }
    if (fundingSource === "unified" && unifiedAvailable < totalNeededNum) {
      toastError(`Insufficient gateway balance (need ${totalNeededNum} ${tokenSymbol})`);
      return;
    }
    if (fundingSource === "hybrid" && (nativeContribution + unifiedContribution) < totalNeededNum) {
      toastError(`Insufficient total available (need ${totalNeededNum} ${tokenSymbol})`);
      return;
    }

    setPendingData(data);
    setShowReview(true);
    play("click");
  };

  const executeCustomTokenSplit = async (
    valid: Recipient[],
    totalAmountWei: bigint
  ) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    if (!publicClient) {
      throw new Error("Blockchain connection unavailable");
    }

    if (!isAddress(customTokenAddress)) {
      throw new Error("Enter a valid token address");
    }

    const tokenAddress = customTokenAddress as Address;

    const transfers = valid.map((recipient) => ({
      to: getAddress(recipient.address),
      amount: parseUnits(recipient.amount, activeDecimals),
    }));

    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, CUSTOM_TOKEN_BATCHER],
    });

    if (allowance < totalAmountWei) {
      setStatus("confirming");
      setStatusMessage(`Approve ${tokenSymbol} spending in your wallet...`);
      play("confirm");

      const approvalHash = await writeApprovalContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CUSTOM_TOKEN_BATCHER, totalAmountWei],
      });

      setStatusMessage("Waiting for token approval...");

      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approvalHash,
      });

      if (approvalReceipt.status !== "success") {
        throw new Error("Token approval transaction failed. Please try again.");
      }

      // Re-read allowance to confirm it landed before proceeding.
      const confirmedAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CUSTOM_TOKEN_BATCHER],
      });

      if (confirmedAllowance < totalAmountWei) {
        throw new Error("Allowance not confirmed on-chain. Please try again.");
      }
    }

    setStatus("confirming");
    setStatusMessage("Confirm batch transfer in your wallet...");
    play("confirm");

    await writeContractAsync({
      address: CUSTOM_TOKEN_BATCHER,
      abi: CUSTOM_TOKEN_BATCHER_ABI,
      functionName: "batchTransfer",
      args: [tokenAddress, transfers],
    });

    setStatus("broadcasting");
    setStatusMessage("Broadcasting...");
    play("await");
  };

  const executeSplit = async () => {
    if (!pendingData || !address) return;
    const valid = pendingData.recipients.filter(r => r.address.trim() && r.amount.trim());
    if (valid.length === 0) {
      toastError("No valid recipients");
      return;
    }
    const totalAmountWei = valid.reduce((sum, r) => {
      const parsed = parseUnits(r.amount, activeDecimals);
      return sum + parsed;
    }, 0n);
    const totalNeededNum = parseFloat(formatUnits(totalAmountWei, activeDecimals));

    setShowReview(false);
    setIsSubmitting(true);
    setTxHash(null);
    setTxError(null);
    setFailedRecipients([]);
    setPendingBridge(null);
    // Without this, only the first split of a session reaches history.
      historySavedRef.current = false;

    const txLabelText = isCustomToken ? "TOKEN SPLIT" : "USDC SPLIT";
    setTxLabel(`${txLabelText} · ${valid.length} recipients · ${totalNeededNum} ${tokenSymbol}`);

    setStatus("building");
    setStatusMessage("Building calldata...");
    play("start");

    try {
      if (isCustomToken) {
        await executeCustomTokenSplit(valid, totalAmountWei);
        return;
      }

      if (needsBridge) {
        setStatus("funding");
        setStatusMessage("Funding via Gateway...");
        play("gateway");
        await bridgeAndSplit();
        return;
      } else {
        const calls = buildTransferCalls(
          activeTokenAddress,
          address,
          valid,
          activeDecimals
        );

        setStatus("confirming");
        setStatusMessage("Confirming on chain...");
        play("confirm");

        await writeContract({
          address: FORWARDER_ADDRESS,
          abi: forwarderAbi,
          functionName: "aggregate3",
          args: [calls],
        });

        setStatus("broadcasting");
        setStatusMessage("Broadcasting...");
        play("await");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("failed");
      setStatusMessage(`Failed: ${err.message || "Unknown error"}`);
      setTxError(err.message || "Transaction failed");
      play("error");
      toastError(err?.message || "Transaction failed");
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isSuccess && receipt && pendingData && address) {
      // Calls are submitted with allowFailure: true, so the transaction can
      // succeed with individual transfers reverted. Report on the transfers
      // themselves rather than on the transaction.
      const outcomes = resolveOutcomes(
        decodeTransfers(receipt.logs, activeTokenAddress),
        pendingData.recipients.filter(r => r.address.trim() && r.amount.trim())
      );
      const failed = outcomes.filter(o => !o.success);
      setFailedRecipients(failed);
      setTxHash(receipt.transactionHash);

      if (failed.length > 0) {
        setStatus("partial");
        setStatusMessage(
          `${failed.length} of ${outcomes.length} transfers did not go through`
        );
        play("error");
        toastError(`${failed.length} of ${outcomes.length} transfers failed. The others were sent.`);
      } else {
        setStatus("confirmed");
        setStatusMessage("Confirmed!");
        play("success");
        setTimeout(() => play("stamp"), 300);
      }
      setIsSubmitting(false);
    }
  }, [isSuccess, receipt, pendingData, address]);

  useEffect(() => {
    if (error) {
      const userError = getUserFacingTxError(error);
      setStatus("failed");
      setStatusMessage(`Failed: ${userError}`);
      setTxError(userError);
      play("error");
      toastError(userError);
      setIsSubmitting(false);
    }
  }, [error]);

  const isLoading = isPending || isWaiting || isSubmitting || savingHistory || isBridging;

  const handleNetworkSwitch = async (networkKey: "arc" | "base" | "eth") => {
    const targetChainId = IS_MAINNET
      ? { arc: 5042, base: 8453, eth: 1 }[networkKey]
      : { arc: 5042002, base: 84532, eth: 11155111 }[networkKey];

    if (chainId === targetChainId) return;

    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (err: any) {
      const message = err?.shortMessage ?? err?.message ?? "";

      if (
        err?.code === 4001 ||
        /user rejected|user denied|rejected|denied|cancelled|canceled/i.test(message)
      ) {
        toastError("Network switch cancelled.");
      } else {
        toastError("Failed to switch network.");
      }
    }
  };

  const getButtonLabel = () => {
    switch (status) {
      case "building": return "BUILDING…";
      case "funding": return "FUNDING…";
      case "confirming": return "CONFIRM IN WALLET";
      case "broadcasting": return "BROADCASTING…";
      case "confirmed": return "CONFIRMED";
      case "failed": return "FAILED — Retry";
      default: return arcSwitch.isMismatched ? "Switch to Arc" : isLoading ? "Processing…" : "Review Split";
    }
  };

  const isSubmitDisabled =
    isLoading ||
    !address ||
    validRecipientsCount === 0 ||
    arcSwitch.isMismatched ||
    status === "broadcasting" ||
    status === "funding";

  // Review modal confirm should be disabled independently — confirmed is fine
  // to re-open a new split, but broadcasting/funding must not allow a second submit.
  const isReviewConfirmDisabled =
    isLoading ||
    !address ||
    arcSwitch.isMismatched ||
    status === "broadcasting" ||
    status === "funding";

  const getStatusColor = () => {
    switch (status) {
      case "building": return "text-[#B8923F]";
      case "funding": return "text-amber";
      case "confirming": return "text-amber";
      case "broadcasting": return "text-amber";
      case "confirmed": return "text-green-400";
      case "partial": return "text-[#C4553D]";
      case "failed": return "text-[#C4553D]";
      default: return "text-[#9C917E]";
    }
  };

  const displayFields = showAllRecipients ? fields : fields.slice(0, 10);
  const hiddenCount = fields.length - 10;

  // Four-step progress bar
  const PROGRESS_STEPS = ["BUILDING", "FUNDING", "CONFIRMING", "BROADCASTING"] as const;
  const progressIndex = status === "building" ? 0 : status === "funding" ? 1 : status === "confirming" ? 2 : status === "broadcasting" ? 3 : -1;
  const progressDone = status === "confirmed" || status === "partial";
  const progressFailed = status === "failed";

  return (
    <div className="space-y-6">
      {/* ── Confirm modal ──────────────────────────────────────────────────── */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {/* Unified Balance Panel */}
      <div className="panel flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="terminal-label text-xs">UNIFIED BALANCE</div>
          <div className="text-3xl font-bold font-mono text-[#F2B134]">
            {isBalanceLoading
              ? <span className="inline-block w-32 h-7 bg-[#241B14] animate-pulse align-middle" />
              : <>${totalUSDC.toFixed(2)} USDC</>}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#9C917E] mt-1">
            <span>wallet <span className="font-mono text-[#EDE3D0]">${nativeUSDCBalance.toFixed(2)}</span></span>
            <span className="text-[#8C806D]">|</span>
            <span>gateway <span className="font-mono text-[#EDE3D0]">${unifiedTotal.toFixed(2)}</span></span>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {[
            { key: "arc", iconKey: "arc" as const, label: IS_MAINNET ? "Arc" : "Arc Testnet", active: chainId === (IS_MAINNET ? 5042 : 5042002) },
            { key: "base", iconKey: "base" as const, label: IS_MAINNET ? "Base" : "Base Sepolia", active: chainId === (IS_MAINNET ? 8453 : 84532) },
            { key: "eth", iconKey: "ethereum" as const, label: IS_MAINNET ? "Ethereum" : "Ethereum Sepolia", active: chainId === (IS_MAINNET ? 1 : 11155111) },
          ].map((net) => (
            <div
              key={net.key}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (net.active) return;

                if (net.key === "arc") {
                  void arcSwitch.switchChain();
                } else if (net.key === "base") {
                  void baseSwitch.switchChain();
                } else if (net.key === "eth") {
                  void ethSwitch.switchChain();
                }
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();

                if (net.active) return;

                if (net.key === "arc") {
                  void arcSwitch.switchChain();
                } else if (net.key === "base") {
                  void baseSwitch.switchChain();
                } else if (net.key === "eth") {
                  void ethSwitch.switchChain();
                }
              }}
              className={`network-pill ${net.active ? "network-pill-active" : "network-pill-inactive"} cursor-pointer`}
            >
              <ChainIcon iconKey={net.iconKey} size="md" />
              {net.active && <Check size={12} className="text-[#F2B134]" />}
              <span>{net.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        {address && (
          <div className="flex flex-wrap items-center gap-4 text-sm border-b border-[rgba(242,177,52,0.16)] pb-3 mb-4">
            <span className="field-label">WALLET</span>
            <span className="data-value font-mono">{displayAddress.slice(0, 6)}…{displayAddress.slice(-4)}</span>
            <span className="field-label">BALANCE</span>
            <span className="data-value font-mono">
              {isCustomToken && isAddress(customTokenAddress)
                ? isLoadingTokenMeta
                  ? "…"
                  : `${nativeAvailable.toFixed(tokenDecimals > 6 ? 6 : tokenDecimals)} ${tokenSymbol}`
                : `${nativeUSDCBalance.toFixed(6)} USDC`}
            </span>
            {networkStatus && <span className="text-amber ml-auto text-xs">{networkStatus}</span>}
          </div>
        )}

        <div className="mb-4">
          <p className="step-label mb-1">01 · ASSET</p>
          <label className="field-label flex items-center gap-1 mb-1">
            <Coins size={14} className="inline-block" /> What asset are you sending?
          </label>
          <select
            value={isCustomToken ? "custom" : USDC_ADDRESS}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setIsCustomToken(true);
                setCustomTokenAddress("");
                setTokenSymbol("???");
                setTokenDecimals(18);
                setFundingSource("native");
              } else {
                setIsCustomToken(false);
                setTokenSymbol("USDC");
                setTokenDecimals(USDC_DECIMALS);
                setCustomTokenAddress("");
                setValue("tokenAddress", USDC_ADDRESS);
              }
              play("click");
            }}
            className="flex-1 select appearance-none"
          >
            <option value={USDC_ADDRESS}>USDC (6 decimals)</option>
            <option value="custom">Custom Token</option>
          </select>
          {isCustomToken && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Enter token address (0x...)"
                value={customTokenAddress}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setCustomTokenAddress(val);
                  // Reset stale metadata immediately so old values never linger.
                  setTokenSymbol("???");
                  setTokenDecimals(18);
                  setTokenName("");
                  if (isAddress(val)) {
                    setValue("tokenAddress", val);
                    setIsLoadingTokenMeta(true);
                    refetchDecimals();
                    refetchSymbol();
                    refetchName();
                  } else {
                    setIsLoadingTokenMeta(false);
                  }
                }}
                className="input"
              />
              {isAddress(customTokenAddress) && (
                <div className="helper-text mt-1">
                  {isLoadingTokenMeta ? (
                    <span className="text-[#8C806D] animate-pulse">Loading token info…</span>
                  ) : (
                    <span className={tokenSymbol === "???" ? "text-[#C4553D]" : ""}>
                      {tokenSymbol === "???" ? "Could not load token — check the address" : `${tokenSymbol} (${tokenName}) • ${tokenDecimals} decimals`}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="step-label mb-1">02 · SPLIT MODE</p>
          <label className="field-label flex items-center gap-1 mb-1">
            <Split size={14} className="inline-block" /> How should this be split?
          </label>
          <div className="grid grid-cols-2 gap-1 bg-[#241B14] p-1 border border-[rgba(242,177,52,0.16)]">
            <button
              type="button"
              onClick={() => { setIsEqualMode(true); setValue("splitMode", "equal"); play("click"); }}
              className={`select-none px-3 py-2.5 font-mono text-sm transition border ${
                isEqualMode
                  ? "bg-amber text-[#15100B] border-[#F2B134]"
                  : "text-[#9C917E] border-[rgba(242,177,52,0.22)] hover:text-[#EDE3D0] hover:border-[rgba(242,177,52,0.45)]"
              }`}
            >
              EQUAL
            </button>
            <button
              type="button"
              onClick={() => { setIsEqualMode(false); setValue("splitMode", "custom"); play("click"); }}
              className={`select-none px-3 py-2.5 font-mono text-sm transition border ${
                !isEqualMode
                  ? "bg-amber text-[#15100B] border-[#F2B134]"
                  : "text-[#9C917E] border-[rgba(242,177,52,0.22)] hover:text-[#EDE3D0] hover:border-[rgba(242,177,52,0.45)]"
              }`}
            >
              CUSTOM
            </button>
          </div>
        </div>

        {isEqualMode && (
          <div className="mb-4">
            <label className="field-label flex items-center gap-1 mb-1">
              <SendIcon size={14} className="inline-block" /> How much are you sending?
            </label>
            <input
              type="number"
              step="0.000001"
              min="0"
              placeholder="0.00"
              {...register("totalAmount")}
              className="input text-sm font-mono"
            />
            {totalAmount && validRecipientsCount > 0 && (
              <p className="helper-text mt-1">
                Each recipient gets: <span className="data-value font-bold text-amber">{getEqualAmount()}</span> {tokenSymbol}
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <p className="step-label mb-1">03 · FUNDING</p>
          <label className="field-label flex items-center gap-1 mb-1">
            <Banknote size={14} className="inline-block" /> Where should the funds come from?
          </label>
          {isCustomToken && (
            <p className="text-[10px] font-mono text-[#8C806D] mb-2">
              Gateway and hybrid funding for custom tokens is a planned integration — only wallet balance is supported right now.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 bg-[#241B14] p-1 border border-[rgba(242,177,52,0.16)]">
            {["native", "unified", "hybrid"].map((src) => {
              const isDisabled = isCustomToken && src !== "native";
              const isPlanned = src === "unified" || src === "hybrid";
              let label = src.toUpperCase();
              if (src === "unified") label = "GATEWAY BALANCE";
              if (src === "hybrid") label = "NATIVE/GATEWAY";
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    if (!isDisabled) {
                      setFundingSource(src as FundingSource);
                      play("click");
                    }
                  }}
                  disabled={isDisabled}
                  title={isDisabled ? `${label} — coming soon for custom tokens` : ""}
                  className={`relative min-w-0 select-none flex items-center justify-between sm:justify-center gap-2 px-3 py-2.5 font-mono text-[12px] sm:text-sm text-left sm:text-center transition border ${
                    fundingSource === src
                      ? "bg-amber text-[#15100B] border-[#F2B134]"
                      : "text-[#9C917E] border-[rgba(242,177,52,0.22)] hover:text-[#EDE3D0] hover:border-[rgba(242,177,52,0.45)]"
                  } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span className="min-w-0 truncate">{label}</span>
                  {isDisabled && isPlanned && (
                    <span className="shrink-0 border border-[rgba(242,177,52,0.3)] bg-[rgba(242,177,52,0.15)] px-1.5 py-0.5 text-[9px] text-[#F2B134] leading-none">
                      SOON
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {totalNeeded > 0 && (
            <div className="mt-2 text-xs text-[#9C917E] space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Native</span>
                <span className={nativeContribution > 0 ? "text-[#EDE3D0]" : ""}>{nativeContribution.toFixed(activeDecimals)} {tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span>Gateway Balance</span>
                <span className={unifiedContribution > 0 ? "text-[#EDE3D0]" : ""}>{unifiedContribution.toFixed(activeDecimals)} {tokenSymbol}</span>
              </div>
              <div className="flex justify-between border-t border-[rgba(242,177,52,0.16)] pt-1">
                <span>Available</span>
                <span className="text-amber">{(nativeAvailable + unifiedAvailable).toFixed(activeDecimals)} {tokenSymbol}</span>
              </div>
              {!isFullyFunded && (
                <div className="text-[#C4553D]">
                  Shortfall: {(totalNeeded - nativeContribution - unifiedContribution).toFixed(activeDecimals)} {tokenSymbol}
                </div>
              )}
            </div>
          )}

          {/* ----- GATEWAY BALANCE SOURCE SELECTOR ----- */}
          {(fundingSource === "unified" || fundingSource === "hybrid") && (
            <div className="mt-2 pt-2 border-t border-[rgba(242,177,52,0.16)]">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-[#9C917E]">
                  Gateway balances to use:
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedGatewaySources(
                      gatewayBalances.map((b) => b.key)
                    )
                  }
                  className="text-[10px] font-mono text-amber hover:text-[#EDE3D0]"
                >
                  SELECT ALL
                </button>
              </div>

              <div className="space-y-1">
                {gatewayBalances.map((b) => {
                  const selected = selectedGatewaySources.includes(b.key);
                  const amount = parseFloat(b.balance || "0");

                  return (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => toggleGatewaySource(b.key)}
                      className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 border text-xs font-mono transition ${
                        selected
                          ? "border-[rgba(242,177,52,0.35)] bg-[rgba(242,177,52,0.06)]"
                          : "border-transparent bg-transparent opacity-60"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-3 h-3 shrink-0 border flex items-center justify-center ${
                            selected
                              ? "border-amber bg-amber text-[#15100B]"
                              : "border-[#8C806D]"
                          }`}
                        >
                          {selected && <Check size={12} className="inline-block" />}
                        </span>
                        <ChainIcon iconKey={chainConfig[b.key].iconKey} size="sm" />
                        <span className="truncate">
                          {chainConfig[b.key].label}
                        </span>
                      </span>

                      <span className="shrink-0 text-[#EDE3D0]">
                        {amount.toFixed(6)} USDC
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between text-xs font-mono border-t border-[rgba(242,177,52,0.16)] pt-1 mt-2">
                <span className="text-[#9C917E]">Selected Gateway</span>
                <span className="text-[#F2B134]">
                  {unifiedAvailable.toFixed(6)} USDC
                </span>
              </div>

              {selectedGatewaySources.length === 0 && (
                <div className="text-[11px] text-[#C4553D] mt-1">
                  Select at least one Gateway balance.
                </div>
              )}
            </div>
          )}
        </div>

        {!isFullyFunded && !isBridging && (
          <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] p-3 mb-4">
            <div className="text-xs text-[#B8923F]">// FUND UNIFIED BALANCE</div>
            <div className="text-sm text-[#9C917E] mt-1">
              You have USDC available on:
            </div>

            {gatewayBalances.map(b => {
              const amt = parseFloat(b.balance || "0");
              let label = `Chain ${b.domain}`;
              const entry = Object.values(chainConfig).find(c => c.domainId === b.domain);
              if (entry) label = entry.label;

              return (
                <div key={b.domain} className="flex justify-between text-sm font-mono">
                  <span className={amt > 0 ? "" : "text-[#8C806D]"}>{label}</span>
                  <span className={amt > 0 ? "text-[#EDE3D0]" : "text-[#8C806D]"}>
                    {amt.toFixed(6)} USDC
                  </span>
                </div>
              );
            })}

            <div className="flex justify-between text-sm font-mono border-t border-[rgba(242,177,52,0.16)] pt-1 mt-2">
              <span className="text-[#9C917E]">Total</span>
              <span className="text-[#F2B134]">
                {gatewayBalances.reduce(
                  (s, b) => s + parseFloat(b.balance || "0"), 0
                ).toFixed(6)}{" "}
                USDC
              </span>
            </div>

            {gatewayBalances.every(b => parseFloat(b.balance || "0") === 0) && (
              <div className="text-sm text-[#9C917E] mt-1">
                No supported USDC balance detected.
              </div>
            )}

            <button
              onClick={() => {
                if (onGoToFundGateway) {
                  onGoToFundGateway();
                } else {
                  toastInfo("Go to the Fund Gateway tab to deposit.");
                }
              }}
              className="btn-primary text-sm py-1 px-3 mt-2 inline-flex items-center gap-1.5"
            >
              <ArrowDownToLine size={14} />
              Deposit to Unified Balance
            </button>
          </div>
        )}

        {isBridging && (
          <div className="bg-amber/10 border border-amber/30 p-3 mb-4">
            <p className="text-amber text-sm">{bridgeProgress}</p>
            <p className="text-[#9C917E] text-xs mt-1">{networkStatus}</p>
            <button
              type="button"
              onClick={() => bridgeAbortRef.current?.abort()}
              className="mt-2 text-xs font-mono underline text-[#9C917E] hover:text-[#EDE3D0]"
            >
              Stop waiting
            </button>
            <p className="text-[#8C806D] text-[10px] mt-1">
              This only stops the countdown. The transfer cannot be cancelled
              once signed, and carries on either way.
            </p>
          </div>
        )}

        {pendingBridge && !isBridging && (
          <div className="bg-amber/10 border border-amber/30 p-3 mb-4">
            <p className="text-amber text-sm font-mono">BRIDGE STILL IN PROGRESS</p>
            <p className="text-[#EDE3D0] text-xs mt-1">
              {pendingBridge.reason === "stopped"
                ? "You stopped waiting. The transfer was already signed and submitted, so it is still on its way."
                : "This is taking longer than usual. The transfer was signed and submitted, so it is still on its way."}
            </p>
            <p className="text-[#9C917E] text-xs mt-2 font-mono break-all">
              Transfer ID: {pendingBridge.transferId}
            </p>
            <p className="text-[#8C806D] text-[10px] mt-1">
              Do not bridge again for this amount. Check your Gateway balance
              in a few minutes, then run the split.
            </p>
            <button
              type="button"
              onClick={() => setPendingBridge(null)}
              className="mt-2 text-xs font-mono underline text-[#9C917E] hover:text-[#EDE3D0]"
            >
              Dismiss
            </button>
          </div>
        )}

        <p className="step-label mt-2 mb-2">04 · IMPORT / PASTE</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="field-label flex items-center gap-1 mb-1">
              <FileSpreadsheet size={14} /> Import CSV?
            </label>
            <div
              className={`border-2 border-dashed p-3 text-center transition ${
                isDragOver ? "border-amber bg-amber/10" : "border-[rgba(242,177,52,0.16)]"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-[#9C917E] text-xs">Drag a CSV here or click to browse</p>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleCSVUpload}
                className="hidden"
              />
            </div>
            {csvError && <p className="text-[#C4553D] text-xs mt-1">{csvError}</p>}
            <p className="helper-text text-xs mt-1">CSV must have columns: <span className="font-mono">address,amount</span></p>
          </div>
          <div>
            <label className="field-label flex items-center gap-1 mb-1">
              <Clipboard size={14} /> Paste addresses?
            </label>
            <textarea
              rows={2}
              placeholder={isEqualMode ? "0x123...\n0x456..." : "0x123...,1.5\n0x456...,2.0"}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="input text-sm font-mono"
            />
            <p className="helper-text text-xs mt-1">
              {isEqualMode
                ? <>One address per line \u2014 each gets <span className="font-mono text-amber">{getEqualAmount() || "\u2014"} {tokenSymbol}</span></>
                : <>One <span className="font-mono">address,amount</span> per line</>}
            </p>
            <button
              type="button"
              onClick={handleBulkPaste}
              className="mt-1 btn-secondary text-xs py-1 px-3 inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              Add from Paste
            </button>
          </div>
        </div>

        <p className="step-label mt-2 mb-2">05 · SAVED LISTS</p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="field-label flex items-center gap-1">
            <Folder size={14} /> Load a saved list?
          </label>
          <select
            ref={savedListSelectRef}
            onChange={(e) => loadList(e.target.value)}
            className="flex-1 select text-sm"
            defaultValue=""
          >
            <option value="" disabled>Select a list…</option>
            {savedLists.map(list => (
              <option key={list.id} value={list.id}>{list.list_name} ({list.recipients.length})</option>
            ))}
          </select>
          {savedLists.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const select = savedListSelectRef.current;
                if (select && select.value) {
                  showConfirm("Delete this list?", () => deleteList(select.value));
                }
              }}
              className="btn-danger text-xs py-1 px-3 inline-flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            placeholder="e.g. Monthly Payroll"
            {...register("listName")}
            className="flex-1 input text-sm"
          />
          <button
            type="button"
            onClick={saveCurrentList}
            disabled={isSavingList || validRecipientsCount === 0}
            className={`btn-secondary text-sm ${(isSavingList || validRecipientsCount === 0) ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <Save size={13} />
            {isSavingList ? "Saving…" : "Save List"}
          </button>
        </div>

        <div>
          <p className="step-label mb-1">06 · RECIPIENTS</p>
          <div className="flex justify-between items-center mb-2">
            <span className="field-label text-[#F2B134] text-sm flex items-center gap-1">
              <Users size={14} /> Who gets paid? ({validRecipientsCount})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="btn-danger text-xs py-1 px-2 inline-flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Clear All
              </button>
              <button
                type="button"
                onClick={() => { append({ address: "", amount: "" }); play("click"); }}
                className="btn-gold text-xs"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto border border-[rgba(242,177,52,0.16)] p-1 bg-[#241B14]">
            {displayFields.length === 0 ? (
              <p className="helper-text text-center py-4 text-xs">Add your first recipient, or import a CSV.</p>
            ) : (
              displayFields.map((field, index) => {
                const realIndex = fields.indexOf(field);
                return (
                  <div key={field.id} className="flex flex-col border-b border-[rgba(242,177,52,0.16)]/50 last:border-0 py-1">
                    <div className="flex gap-2 items-center text-xs">
                    <input
                      placeholder="0x..."
                      {...register(`recipients.${realIndex}.address`, {
                        validate: (value) => !value || isAddress(value) || "Invalid address",
                      })}
                      className={`flex-1 bg-transparent border-0 border-b border-dashed focus:border-amber focus:outline-none font-mono px-1 py-0.5 ${errors.recipients?.[realIndex]?.address ? "border-[#C4553D] text-[#C4553D]" : "border-[rgba(242,177,52,0.16)] text-[#EDE3D0]"}`}
                    />
                    <input
                      placeholder="Amount"
                      {...register(`recipients.${realIndex}.amount`, {
                        validate: (value) =>
                          !value || (!isNaN(parseFloat(value)) && parseFloat(value) > 0) || "Invalid",
                      })}
                      disabled={isEqualMode}
                      className={`w-24 bg-transparent border-0 border-b border-dashed focus:border-amber focus:outline-none font-mono px-1 py-0.5 text-right ${isEqualMode ? "opacity-50 cursor-not-allowed" : ""} ${errors.recipients?.[realIndex]?.amount ? "border-[#C4553D] text-[#C4553D]" : "border-[rgba(242,177,52,0.16)] text-[#EDE3D0]"}`}
                    />
                    <button
                      type="button"
                      onClick={() => { remove(realIndex); play("click"); }}
                      className="text-[#9C917E] hover:text-[#C4553D] transition px-1"
                    >
                      <X size={12} />
                    </button>
                    </div>
                    {(errors.recipients?.[realIndex]?.address || errors.recipients?.[realIndex]?.amount) && (
                      <p className="text-[10px] font-mono text-[#C4553D] mt-0.5 pl-1">
                        {errors.recipients?.[realIndex]?.address?.message || errors.recipients?.[realIndex]?.amount?.message}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {fields.length > 10 && (
            <button
              type="button"
              onClick={() => setShowAllRecipients(!showAllRecipients)}
              className="text-xs text-[#F2B134] hover:underline mt-1"
            >
              {showAllRecipients ? "Show less" : `Show all (${hiddenCount} more)`}
            </button>
          )}
        </div>

        {/* Sticky totals on mobile */}
        <div className="sticky bottom-[44px] md:static border-t border-[rgba(242,177,52,0.16)] pt-3 mt-3 bg-[#1D1712] z-10">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="field-label flex items-center gap-1 text-[#F2B134]">
                <Receipt size={14} /> Review the total
              </span>
              <span className="data-value font-bold text-amber">
                {isCustomToken && (tokenSymbol === "???" || !isAddress(customTokenAddress))
                  ? "—"
                  : `${getTotalToSend().toFixed(Math.min(activeDecimals, 6))} ${tokenSymbol}`}
              </span>
            </div>
            <div>
              <span className="field-label block">RECIPIENTS</span>
              <span className="data-value">{validRecipientsCount}</span>
            </div>
            <div>
              <span className="field-label block">EACH</span>
              <span className="data-value">
                {isEqualMode
                  ? `${getEqualAmount() || "—"} ${tokenSymbol}`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {status !== "idle" && (
         <div className="mt-3 p-3 border border-[rgba(242,177,52,0.16)] bg-[#241B14]">

           {/* ── 4-step progress bar ───────────────────────────────────────── */}
           <div className="grid grid-cols-4 mb-3">
             {PROGRESS_STEPS.map((step, i) => {
               const isActive = i === progressIndex;
               const isPast  = progressDone || (progressIndex > i && progressIndex >= 0);
               const isFail  = progressFailed && i === progressIndex;
               return (
                 <div key={step} className={["relative text-center py-2 px-1 border-b-2 transition-colors",
                   isFail        ? "border-[#C4553D]"
                   : isPast || progressDone ? "border-[#4ADE80]"
                   : isActive    ? "border-[#F2B134]"
                   :               "border-[rgba(242,177,52,0.12)]",
                 ].join(" ")}>
                   <span className={["font-mono text-[9px] uppercase tracking-[0.12em]",
                     isFail ? "text-[#C4553D]" : isPast || progressDone ? "text-[#4ADE80]" : isActive ? "text-[#F2B134]" : "text-[#8C806D]",
                   ].join(" ")}>
                     {isActive && !progressDone && !progressFailed
                       ? <LoaderCircle size={9} className="animate-spin inline-block mr-0.5" />
                       : null}
                     {step}
                   </span>
                 </div>
               );
             })}
           </div>

           {/* ── Terminal message ──────────────────────────────────────────── */}
           <div className="flex items-center gap-2 mb-1">
             {progressDone && <CheckCircle size={13} className="text-[#4ADE80] shrink-0" />}
             {status === "partial" && <AlertTriangle size={13} className="text-[#C4553D] shrink-0" />}
             {progressFailed && <XCircle size={13} className="text-[#C4553D] shrink-0" />}
             <span className={`font-mono text-xs ${getStatusColor()}`}>
               {statusMessage || networkStatus || "Processing..."}
             </span>
           </div>

           {txHash && (
             <div className="text-xs text-amber mt-1">
               <a href={`https://${IS_MAINNET ? "explorer.arc.io" : "testnet.arcscan.app"}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                 View on Explorer
               </a>
             </div>
           )}

           {bridgeTxHash && (
             <div className="text-xs text-amber mt-1">
               Bridge tx: <a href={`https://${IS_MAINNET ? "explorer.arc.io" : "testnet.arcscan.app"}/tx/${bridgeTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                 {bridgeTxHash.slice(0, 10)}…
               </a>
             </div>
           )}

           {txError && <div className="text-[#C4553D] text-xs mt-1">{txError}</div>}

           {failedRecipients.length > 0 && (
             <div className="mt-2 text-xs">
               <div className="text-[#C4553D] font-mono mb-1">
                 These transfers reverted — the money was not sent:
               </div>
               <ul className="space-y-0.5">
                 {failedRecipients.map((r, i) => (
                   <li key={`${r.address}-${i}`} className="font-mono text-[#9C917E]">
                     {r.address.slice(0, 6)}…{r.address.slice(-4)} · {r.amount} {tokenSymbol}
                   </li>
                 ))}
               </ul>
               <button
                 type="button"
                 onClick={() => {
                   setValue(
                     "recipients",
                     failedRecipients.map(r => ({ address: r.address, amount: r.amount }))
                   );
                   setValue("totalAmount", "");
                   setIsEqualMode(false);
                   setFailedRecipients([]);
                   setStatus("idle");
                   setStatusMessage("");
                   setTxHash(null);
                   setBridgeTxHash(null);
                   setTxError(null);
                   setPendingData(null);
                   setIsSubmitting(false);
                   resetWrite();
                   historySavedRef.current = false;
                 }}
                 className="mt-2 underline text-[#F2B134] hover:text-[#EDE3D0] font-mono"
               >
                 Retry just these — the rest were already paid
               </button>
             </div>
           )}
         </div>
       )}

       <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              setValue("recipients", [{ address: "", amount: "" }]);
              setValue("totalAmount", "");
              play("click");
              setStatus("idle");
              setStatusMessage("");
              setTxLabel("");
              setTxError(null);
              setTxHash(null);
              setBridgeTxHash(null);
              setIsSubmitting(false);
              setShowReview(false);
              setShowAllRecipients(false);
              setFailedRecipients([]);
              setPendingData(null);
              setPendingBridge(null);
              historySavedRef.current = false;
              if (savedListSelectRef.current) savedListSelectRef.current.value = "";
            }}
            className="btn-secondary flex-1 inline-flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="submit"
            onClick={handleSubmit(onReview)}
            disabled={isSubmitDisabled}
            className={`btn-primary flex-1 inline-flex items-center justify-center gap-1.5 ${isSubmitDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {getButtonLabel() === "Review Split" ? (
              <>
                Review Split <ArrowRight size={14} className="inline-block ml-1" />
              </>
            ) : status === "confirmed" ? (
              <>
                <Check size={14} className="inline-block mr-1.5" />
                CONFIRMED
              </>
            ) : status === "confirming" ? (
              <>
                <Send size={14} className="inline-block mr-1.5" />
                {getButtonLabel()}
              </>
            ) : (
              getButtonLabel()
            )}
          </button>
        </div>
        {arcSwitch.isMismatched && (
          <div className="mt-2 flex flex-wrap items-center gap-2 bg-[#C4553D]/10 border border-[#C4553D]/30 p-2">
            <span className="text-[#C4553D] text-sm flex-1 min-w-[100px]">Switch to Arc to split</span>
            <button
              onClick={arcSwitch.switchChain}
              disabled={arcSwitch.isSwitching}
              className="btn-primary text-sm py-1 px-3 shrink-0"
            >
              {arcSwitch.isSwitching ? "Confirm in wallet…" : "Switch Network"}
            </button>
          </div>
        )}
        {arcSwitch.error && <div className="text-[#C4553D] text-xs mt-1">{arcSwitch.error}</div>}
      </div>

      {showReview && pendingData && (
        <ReviewModal
          pendingData={pendingData}
          tokenSymbol={tokenSymbol}
          activeDecimals={activeDecimals}
          validRecipientsCount={validRecipientsCount}
          getTotalToSend={getTotalToSend}
          fundingSource={fundingSource}
          nativeContribution={nativeContribution}
          unifiedContribution={unifiedContribution}
          isCustomToken={isCustomToken}
          arcSwitch={arcSwitch}
          isLoading={isLoading}
          isReviewConfirmDisabled={isReviewConfirmDisabled}
          onCancel={() => { setShowReview(false); play("click"); }}
          onConfirm={executeSplit}
        />
      )}
    </div>
  );
}