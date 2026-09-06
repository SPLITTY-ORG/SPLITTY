import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { parse as parseCSV } from "csv-parse/sync";
import { isAddress, getAddress, formatUnits, parseUnits, type Address, decodeEventLog } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useSwitchChain,
  useSignTypedData,
  useReadContract,
} from "wagmi";
import toast from "react-hot-toast";
import { toastSuccess, toastError, toastLoading, toastInfo } from "../lib/toast";
import { FORWARDER_ADDRESS, forwarderAbi, buildTransferCalls } from "../utils/multicall";
import { supabase } from "../lib/supabase";
import { chainConfig } from "../config/gateway";
import { bridgeToArc, pollTransferStatus } from "../utils/gatewayBridge";
import { useSound } from "../hooks/useSound";
import { useChainSwitch } from "../hooks/useChainSwitch";
import { useWalletBalance, useInvalidateBalances, useGatewayBalance } from "../hooks/useBalances";
import { getBestGatewaySource } from "../utils/gatewaySelection";
import {
  Trash2,
  Plus,
  RotateCcw,
  ArrowRight,
  CheckCircle,
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
} from "lucide-react";

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
] as const;

const TRANSFER_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: false, name: "value", type: "uint256" },
  ],
  name: "Transfer",
  type: "event",
} as const;

type FundingSource = "native" | "unified" | "hybrid";
type Status = "idle" | "building" | "funding" | "confirming" | "broadcasting" | "confirmed" | "failed";

export function SplitForm() {
  const [csvError, setCsvError] = useState<string | null>(null);
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
  const [networkStatus, setNetworkStatus] = useState("");
  const [isCustomToken, setIsCustomToken] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("USDC");
  const [tokenDecimals, setTokenDecimals] = useState<number>(USDC_DECIMALS);
  const [tokenName, setTokenName] = useState("USD Coin");
  const [fundingSource, setFundingSource] = useState<FundingSource>("native");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [txLabel, setTxLabel] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);
  const [showAllRecipients, setShowAllRecipients] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedListSelectRef = useRef<HTMLSelectElement>(null);
  const historySavedRef = useRef(false);

  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const { play } = useSound();
  const { invalidateWallet, invalidateGateway } = useInvalidateBalances();

  const arcSwitch = useChainSwitch("arc");
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
    if (fetchedDecimals !== undefined) setTokenDecimals(Number(fetchedDecimals));
    if (fetchedSymbol) setTokenSymbol(fetchedSymbol);
    if (fetchedName) setTokenName(fetchedName);
  }, [fetchedDecimals, fetchedSymbol, fetchedName]);

  const activeTokenAddress = isCustomToken && isAddress(customTokenAddress)
    ? customTokenAddress as Address
    : USDC_ADDRESS;
  const activeDecimals = isCustomToken ? tokenDecimals : USDC_DECIMALS;

  const chainIdForBalance = chainId || 5042002;
  const { data: balanceRaw, refetch: refetchBalance } = useWalletBalance(
    activeTokenAddress,
    chainIdForBalance
  );
  const tokenBalance = balanceRaw ? BigInt(balanceRaw) : undefined;

  const { data: usdcBalanceRaw } = useWalletBalance(
    USDC_ADDRESS,
    chainIdForBalance
  );

  const { data: nativeBalance } = useBalance({
    address: address,
  });

  const arcGateway = useGatewayBalance(26);
  const baseGateway = useGatewayBalance(6);
  const ethGateway = useGatewayBalance(0);

  const gatewayBalances = [
    { domain: 26, balance: arcGateway.data ?? "0" },
    { domain: 6, balance: baseGateway.data ?? "0" },
    { domain: 0, balance: ethGateway.data ?? "0" },
  ];

  const { writeContract, data: writeData, isPending, error } = useWriteContract();
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
    if (address) fetchSavedLists();
  }, [address]);

  const loadList = (listId: string) => {
    const list = savedLists.find(l => l.id === listId);
    if (!list) return;
    const hasUnsavedWork = recipients.some(r => r.address.trim() || r.amount.trim());
    if (hasUnsavedWork && !confirm(`Load "${list.list_name}"? This will replace the recipients currently in the form.`)) {
      return;
    }
    setValue("recipients", list.recipients);
    toastSuccess(`Loaded "${list.list_name}"`);
    play("click");
    setTimeout(() => handleSubmit(() => {})(), 0);
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
    if (existing && !confirm(`A list named "${listName}" already exists. Overwrite it?`)) {
      setIsSavingList(false);
      return;
    }
    const { error } = existing
      ? await supabase
          .from("saved_recipient_lists")
          .update({ recipients: currentRecipients })
          .eq("id", existing.id)
      : await supabase
          .from("saved_recipient_lists")
          .insert({
            wallet_address: address,
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
          const transfers = receipt.logs
            .filter(log => log.address.toLowerCase() === activeTokenAddress.toLowerCase())
            .map(log => {
              try {
                const decoded = decodeEventLog({
                  abi: [TRANSFER_EVENT_ABI],
                  data: log.data,
                  topics: log.topics,
                });
                return { to: decoded.args.to as string, value: decoded.args.value as bigint };
              } catch { return null; }
            })
            .filter((t): t is { to: string; value: bigint } => t !== null);

          const successfulTo = new Set(transfers.map(t => getAddress(t.to)));
          const recipientsWithStatus = pendingData.recipients
            .filter(r => r.address.trim() && r.amount.trim())
            .map(r => ({
              address: r.address,
              amount: r.amount,
              success: successfulTo.has(getAddress(r.address)),
            }));

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
                fundingSource,
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
            invalidateWallet(chainId || 5042002, activeTokenAddress);
            if (activeTokenAddress === USDC_ADDRESS) {
              invalidateGateway(26);
            }
            setTimeout(resetAfterTransaction, 2000);
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

  // ---------- Equal mode distribution effect ----------
  useEffect(() => {
    if (!isEqualMode) return;
    const total = parseFloat(totalAmount);
    const filledIndexes = recipients
      .map((r, i) => ({ addr: r.address.trim(), i }))
      .filter(x => x.addr);
    if (!total || filledIndexes.length === 0) return;
    const each = (total / filledIndexes.length).toFixed(activeDecimals);
    filledIndexes.forEach(({ i }) => {
      const current = watch(`recipients.${i}.amount`);
      if (current !== each) setValue(`recipients.${i}.amount`, each);
    });
  }, [isEqualMode, totalAmount, recipients.map(r => r.address).join(","), activeDecimals, watch, setValue]);

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
    if (confirm("Remove all recipients?")) {
      setValue("recipients", [{ address: "", amount: "" }]);
      play("click");
      setShowAllRecipients(false);
    }
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
      toastError("Please paste some addresses and amounts");
      return;
    }
    const lines = bulkInput.split("\n").filter((line) => line.trim());
    const newRecipients: Recipient[] = [];
    const errors: string[] = [];
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
      newRecipients.push({ address: getAddress(addr), amount: amt });
    });
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
  const unifiedAvailable = gatewayBalances
    .reduce((sum, b) => sum + parseFloat(b.balance || "0"), 0);
  const totalUSDC = nativeUSDCBalance + unifiedAvailable;

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

  // ---------- Bridge + Split ----------
  const bridgeAndSplit = async () => {
    const bail = (msg: string) => {
      toastError(msg);
      setStatus("idle");
      setStatusMessage("");
      setIsSubmitting(false);
    };
    if (isCustomToken) return bail("Bridge is only supported for USDC. Please use USDC for bridging.");
    if (!address) return bail("Wallet not connected");
    const amountToBridge = unifiedContribution;
    if (amountToBridge <= 0) return bail("No unified contribution needed");

    const bestSource = getBestGatewaySource(amountToBridge, gatewayBalances);
    if (!bestSource) return bail("No Gateway balance available on any supported chain.");

    if (bestSource.balance < amountToBridge) {
      return bail(`Insufficient balance on ${bestSource.label} (need ${amountToBridge.toFixed(6)}, have ${bestSource.balance.toFixed(6)})`);
    }

    setGatewaySourceChain(bestSource.key as keyof typeof chainConfig);

    if (bridgeSwitch.isMismatched) {
      toastInfo(`Please switch your wallet to ${bestSource.label} to continue. Then click Review Split again.`);
      setStatus("idle");
      setStatusMessage("");
      setIsSubmitting(false);
      return;
    }

    setIsBridging(true);
    setBridgeProgress(`Preparing bridge from ${bestSource.label}...`);
    setNetworkStatus("");

    try {
      const amount = Math.ceil(amountToBridge * 1e6) / 1e6;
      setBridgeProgress(`Bridging ${amount} USDC from ${bestSource.label} to Arc...`);
      setNetworkStatus(`Bridging...`);

      const { transferId } = await bridgeToArc(
        address,
        signTypedDataAsync,
        bestSource.key as keyof typeof chainConfig,
        amount,
        (msg) => setBridgeProgress(msg)
      );

      setBridgeProgress(`Bridge submitted (ID: ${transferId}). Waiting for finality...`);
      setNetworkStatus(`Waiting for bridge finality...`);

      const result = await pollTransferStatus(transferId, 180000);
      if (result.status === "finalized" || result.status === "confirmed") {
        toastSuccess(`Bridge completed! Transaction: ${result.transactionHash || transferId}`);
        setNetworkStatus(`Bridge complete!`);
        setBridgeTxHash(result.transactionHash || transferId);

        invalidateGateway(bestSource.domainId);
        invalidateWallet(5042002, USDC_ADDRESS);
        invalidateGateway(26);

        if (chainId !== 5042002) {
          setNetworkStatus(`Switching back to Arc...`);
          const switchToast = toastLoading(`Switching back to Arc...`);
          try {
            await switchChainAsync({ chainId: 5042002 });
            toastSuccess(`Switched back to Arc`, { id: switchToast });
            setNetworkStatus(`Connected to Arc`);
            await new Promise(r => setTimeout(r, 2000));
          } catch (err) {
            toastError(`Please switch back to Arc manually`, { id: switchToast, duration: 10000 });
            setNetworkStatus(`⚠️ Please switch to Arc manually`);
          }
        }

        setNetworkStatus(`Refreshing balance...`);
        await refetchBalance();
        await executeSplitAfterBridge();
      } else {
        throw new Error("Bridge failed or timed out.");
      }
    } catch (err: any) {
      console.error(err);
      toastError(err.message || "Bridge failed");
      setNetworkStatus(`❌ ${err.message}`);
      setStatus("failed");
      setStatusMessage(`Bridge failed: ${err.message}`);
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

    const txLabelText = isCustomToken ? "TOKEN SPLIT" : "USDC SPLIT";
    setTxLabel(`${txLabelText} · ${valid.length} recipients · ${totalNeededNum} ${tokenSymbol}`);

    setStatus("building");
    setStatusMessage("Building calldata...");
    play("start");

    try {
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
      setStatus("confirmed");
      setStatusMessage("Confirmed!");
      setTxHash(receipt.transactionHash);
      play("success");
      setTimeout(() => play("stamp"), 300);
      setIsSubmitting(false);
    }
  }, [isSuccess, receipt, pendingData, address]);

  useEffect(() => {
    if (error) {
      setStatus("failed");
      setStatusMessage(`Failed: ${error.message || "Unknown error"}`);
      setTxError(error.message || "Transaction failed");
      play("error");
      toastError(error?.message || "Transaction failed");
      setIsSubmitting(false);
    }
  }, [error]);

  const isLoading = isPending || isWaiting || isSubmitting || savingHistory || isBridging;

  const getButtonLabel = () => {
    switch (status) {
      case "building": return "BUILDING…";
      case "funding": return "FUNDING…";
      case "confirming": return "CONFIRM IN WALLET";
      case "broadcasting": return "BROADCASTING…";
      case "confirmed": return "✓ CONFIRMED";
      case "failed": return "FAILED — Retry";
      default: return arcSwitch.isMismatched ? "Switch to Arc" : isLoading ? "Processing…" : "Review Split →";
    }
  };

  const isSubmitDisabled =
    isLoading ||
    !address ||
    validRecipientsCount === 0 ||
    arcSwitch.isMismatched ||
    status === "broadcasting" ||
    status === "confirmed" ||
    status === "funding";

  const getStatusColor = () => {
    switch (status) {
      case "building": return "text-[#8A6A2C]";
      case "funding": return "text-amber";
      case "confirming": return "text-amber";
      case "broadcasting": return "text-amber";
      case "confirmed": return "text-green-400";
      case "failed": return "text-[#C4553D]";
      default: return "text-[#9C917E]";
    }
  };

  const displayFields = showAllRecipients ? fields : fields.slice(0, 10);
  const hiddenCount = fields.length - 10;

  return (
    <div className="space-y-6">
      {/* Unified Balance Panel */}
      <div className="panel flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="terminal-label text-xs">UNIFIED BALANCE</div>
          <div className="text-3xl font-bold font-mono text-[#F2B134]">
            ${totalUSDC.toFixed(2)} USDC
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#9C917E] mt-1">
            <span>wallet <span className="font-mono text-[#EDE3D0]">${nativeUSDCBalance.toFixed(2)}</span></span>
            <span className="text-[#6B5F4F]">|</span>
            <span>gateway <span className="font-mono text-[#EDE3D0]">${unifiedAvailable.toFixed(2)}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[
            { key: "arc", label: "Arc", active: chainId === 5042002 },
            { key: "base", label: "Base", active: chainId === 84532 },
            { key: "eth", label: "Ethereum Sepolia", active: chainId === 11155111 },
          ].map((net) => (
            <div
              key={net.key}
              className={`network-pill ${net.active ? "network-pill-active" : "network-pill-inactive"}`}
            >
              <span className={`network-dot ${net.active ? "network-dot-active" : "network-dot-inactive"}`}></span>
              {net.active && <span className="text-[#F2B134]">✓</span>}
              <span>{net.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        {address && (
          <div className="flex flex-wrap items-center gap-4 text-sm border-b border-[rgba(242,177,52,0.16)] pb-3 mb-4">
            <span className="field-label">WALLET</span>
            <span className="data-value font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
            <span className="field-label">BALANCE</span>
            <span className="data-value font-mono">{nativeAvailable.toFixed(6)} {tokenSymbol}</span>
            {networkStatus && <span className="text-amber ml-auto text-xs">{networkStatus}</span>}
          </div>
        )}

        <div className="mb-4">
          <label className="field-label block mb-1 text-amber text-xs uppercase tracking-wider flex items-center gap-1">
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
            className="flex-1 select"
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
                  if (isAddress(val)) {
                    setValue("tokenAddress", val);
                    refetchDecimals();
                    refetchSymbol();
                    refetchName();
                  } else {
                    setTokenSymbol("???");
                    setTokenDecimals(18);
                  }
                }}
                className="input"
              />
              {isAddress(customTokenAddress) && (
                <div className="helper-text mt-1">
                  {tokenSymbol} ({tokenName}) • {tokenDecimals} decimals
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="field-label block mb-1 text-amber text-xs uppercase tracking-wider flex items-center gap-1">
            <Split size={14} className="inline-block" /> How should this be split?
          </label>
          <div className="flex gap-1 bg-[#241B14] rounded p-1 border border-[rgba(242,177,52,0.16)]">
            <button
              type="button"
              onClick={() => { setIsEqualMode(true); setValue("splitMode", "equal"); play("click"); }}
              className={`flex-1 px-3 py-1.5 rounded font-mono text-sm transition ${
                isEqualMode
                  ? "bg-amber text-[#15100B]"
                  : "text-[#9C917E] hover:text-[#EDE3D0]"
              }`}
            >
              EQUAL
            </button>
            <button
              type="button"
              onClick={() => { setIsEqualMode(false); setValue("splitMode", "custom"); play("click"); }}
              className={`flex-1 px-3 py-1.5 rounded font-mono text-sm transition ${
                !isEqualMode
                  ? "bg-amber text-[#15100B]"
                  : "text-[#9C917E] hover:text-[#EDE3D0]"
              }`}
            >
              CUSTOM
            </button>
          </div>
        </div>

        {isEqualMode && (
          <div className="mb-4">
            <label className="field-label block mb-1 text-amber text-xs uppercase tracking-wider flex items-center gap-1">
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
          <label className="field-label block mb-1 text-amber text-xs uppercase tracking-wider flex items-center gap-1">
            <Banknote size={14} className="inline-block" /> Where should the funds come from?
          </label>
          <div className="flex gap-1 bg-[#241B14] rounded p-1 border border-[rgba(242,177,52,0.16)]">
            {["native", "unified", "hybrid"].map((src) => {
              const isDisabled = isCustomToken && src !== "native";
              // Custom labels for funding sources
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
                  className={`flex-1 px-3 py-1.5 rounded font-mono text-sm transition ${
                    fundingSource === src
                      ? "bg-amber text-[#15100B]"
                      : "text-[#9C917E] hover:text-[#EDE3D0]"
                  } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  title={isDisabled ? "Coming soon – only native funding supported for custom tokens" : ""}
                >
                  <span className="truncate">{label}</span>
                  {isDisabled && <span className="hidden sm:inline"> (soon)</span>}
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

          {/* ----- GATEWAY BALANCE BREAKDOWN (when GATEWAY BALANCE or NATIVE/GATEWAY) ----- */}
          {(fundingSource === "unified" || fundingSource === "hybrid") && (
            <div className="mt-2 pt-2 border-t border-[rgba(242,177,52,0.16)]">
              <div className="text-xs text-[#9C917E]">Gateway balances:</div>
              {gatewayBalances.filter(b => b.domain !== 26).map((b) => {
                let label = `Chain ${b.domain}`;
                if (chainConfig) {
                  const entry = Object.values(chainConfig).find(c => c.domainId === b.domain);
                  if (entry) label = entry.label;
                }
                return (
                  <div key={b.domain} className="flex justify-between text-xs font-mono">
                    <span>{label}</span>
                    <span className="text-[#EDE3D0]">{parseFloat(b.balance || "0").toFixed(6)} USDC</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-xs font-mono border-t border-[rgba(242,177,52,0.16)] pt-1 mt-1">
                <span className="text-[#9C917E]">Total Gateway</span>
                <span className="text-[#F2B134]">{unifiedAvailable.toFixed(6)} USDC</span>
              </div>
            </div>
          )}
        </div>

        {!isFullyFunded && !isBridging && (
          <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded p-3 mb-4">
            <div className="text-xs text-[#8A6A2C]">// FUND UNIFIED BALANCE</div>
            <div className="text-sm text-[#9C917E] mt-1">
              You have USDC available on:
            </div>
            {gatewayBalances.filter(b => b.domain !== 26 && parseFloat(b.balance) > 0).map(b => {
              let label = `Chain ${b.domain}`;
              if (chainConfig) {
                const entry = Object.values(chainConfig).find(c => c.domainId === b.domain);
                if (entry) label = entry.label;
              }
              return (
                <div key={b.domain} className="flex justify-between text-sm font-mono">
                  <span>{label}</span>
                  <span>{parseFloat(b.balance).toFixed(6)} USDC</span>
                </div>
              );
            })}
            {gatewayBalances.every(b => b.domain === 26 || parseFloat(b.balance) === 0) && (
              <div className="text-sm text-[#9C917E]">No supported USDC balance detected.</div>
            )}
            <button
              onClick={() => {
                toastInfo("Deposit to Unified Balance");
              }}
              className="btn-primary text-sm py-1 px-3 mt-2 inline-flex items-center gap-1.5"
            >
              <ArrowDownToLine size={14} />
              Deposit to Unified Balance
            </button>
          </div>
        )}

        {isBridging && (
          <div className="bg-amber/10 border border-amber/30 rounded p-3 mb-4">
            <p className="text-amber text-sm">{bridgeProgress}</p>
            <p className="text-[#9C917E] text-xs mt-1">{networkStatus}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="field-label block mb-1 text-amber text-xs uppercase tracking-wider flex items-center gap-1">
              <FileSpreadsheet size={14} className="inline-block" /> Import CSV?
            </label>
            <div
              className={`border-2 border-dashed rounded p-3 text-center transition ${
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
            <label className="field-label block mb-1 text-amber text-xs uppercase tracking-wider flex items-center gap-1">
              <Clipboard size={14} className="inline-block" /> Paste addresses?
            </label>
            <textarea
              rows={2}
              placeholder="0x123...,1.5&#10;0x456...,2.0"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="input text-sm font-mono"
            />
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

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="field-label text-amber text-xs uppercase tracking-wider flex items-center gap-1">
            <Folder size={14} className="inline-block" /> Load a saved list?
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
                  if (confirm("Delete this list?")) deleteList(select.value);
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
            className={`btn-primary text-sm ${(isSavingList || validRecipientsCount === 0) ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {isSavingList ? "Saving…" : "Save"}
          </button>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="section-heading text-sm text-amber flex items-center gap-1">
              <Users size={14} className="inline-block" /> Who gets paid? ({validRecipientsCount})
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
                className="text-xs bg-amber hover:bg-[#D99A2A] text-[#15100B] font-bold px-3 py-1 rounded transition inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto border border-[rgba(242,177,52,0.16)] rounded p-1 bg-[#241B14]">
            {displayFields.length === 0 ? (
              <p className="helper-text text-center py-4 text-xs">Add your first recipient, or import a CSV.</p>
            ) : (
              displayFields.map((field, index) => {
                const realIndex = fields.indexOf(field);
                return (
                  <div key={field.id} className="flex gap-2 items-center text-xs py-1 border-b border-[rgba(242,177,52,0.16)]/50 last:border-0">
                    <input
                      placeholder="0x..."
                      {...register(`recipients.${realIndex}.address`, {
                        validate: (value) => !value || isAddress(value) || "Invalid address",
                      })}
                      className="flex-1 bg-transparent border-0 border-b border-dashed border-[rgba(242,177,52,0.16)] focus:border-amber focus:outline-none text-[#EDE3D0] font-mono px-1 py-0.5"
                    />
                    <input
                      placeholder="Amount"
                      {...register(`recipients.${realIndex}.amount`, {
                        validate: (value) =>
                          !value || (!isNaN(parseFloat(value)) && parseFloat(value) > 0) || "Invalid",
                      })}
                      disabled={isEqualMode}
                      className={`w-24 bg-transparent border-0 border-b border-dashed border-[rgba(242,177,52,0.16)] focus:border-amber focus:outline-none text-[#EDE3D0] font-mono px-1 py-0.5 text-right ${isEqualMode ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => { remove(realIndex); play("click"); }}
                      className="text-[#9C917E] hover:text-[#C4553D] transition px-1"
                    >
                      ✕
                    </button>
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

        <div className="border-t border-[rgba(242,177,52,0.16)] pt-3 mt-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="field-label block text-amber text-xs uppercase tracking-wider flex items-center gap-1">
                <Receipt size={14} className="inline-block" /> Review the total
              </span>
              <span className="data-value font-bold text-amber">{getTotalToSend().toFixed(activeDecimals)} {tokenSymbol}</span>
            </div>
            <div>
              <span className="field-label block">RECIPIENTS</span>
              <span className="data-value">{validRecipientsCount}</span>
            </div>
            <div>
              <span className="field-label block">EACH</span>
              <span className="data-value">
                {validRecipientsCount > 0 && !isEqualMode ?
                  (getTotalToSend() / validRecipientsCount).toFixed(activeDecimals) :
                  getEqualAmount() || "—"
                } {tokenSymbol}
              </span>
            </div>
          </div>
        </div>

        {status !== "idle" && (
          <div className="mt-3 p-2 border border-[rgba(242,177,52,0.16)] rounded bg-[#241B14]">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs ${getStatusColor()}`}>
                {status === "building" && "◌ BUILDING"}
                {status === "funding" && "◌ FUNDING"}
                {status === "confirming" && "◌ CONFIRMING"}
                {status === "broadcasting" && "◌ BROADCASTING"}
                {status === "confirmed" && "✓ CONFIRMED"}
                {status === "failed" && "✗ FAILED"}
              </span>
              <span className="text-[#9C917E] text-xs">{statusMessage}</span>
            </div>
            {txHash && (
              <div className="text-xs text-amber mt-1">
                <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  View on Explorer
                </a>
              </div>
            )}
            {bridgeTxHash && (
              <div className="text-xs text-amber mt-1">
                Bridge tx: <a href={`https://testnet.arcscan.app/tx/${bridgeTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  {bridgeTxHash.slice(0, 10)}…
                </a>
              </div>
            )}
            {txError && <div className="text-[#C4553D] text-xs mt-1">{txError}</div>}
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
              savedListSelectRef.current && (savedListSelectRef.current.value = "");
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
            {getButtonLabel() === "Review Split →" ? (
              <>
                Review Split <ArrowRight size={14} className="inline-block ml-1" />
              </>
            ) : getButtonLabel() === "Switch to Arc" || getButtonLabel() === "Processing…" ? (
              getButtonLabel()
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
          <div className="mt-2 flex flex-wrap items-center gap-2 bg-[#C4553D]/10 border border-[#C4553D]/30 rounded p-2">
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1D1712] border border-[rgba(242,177,52,0.16)] rounded shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <h3 className="text-xl font-bold font-sans text-amber mb-4">Review Split</h3>
            <div className="space-y-4">
              <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded p-4">
                <div className="flex justify-between text-sm">
                  <span className="field-label">Token</span>
                  <span className="data-value font-bold text-amber">{tokenSymbol}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="field-label">Recipients</span>
                  <span className="data-value font-bold">{validRecipientsCount}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="field-label">Total</span>
                  <span className="data-value font-bold text-amber">{getTotalToSend().toFixed(activeDecimals)} {tokenSymbol}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="field-label">Funding</span>
                  <span className="data-value">
                    {fundingSource === "unified" ? "GATEWAY BALANCE" :
                     fundingSource === "hybrid" ? "NATIVE/GATEWAY" :
                     fundingSource.toUpperCase()}
                  </span>
                </div>
                {fundingSource !== "native" && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="field-label">Native</span>
                    <span className="data-value">{nativeContribution.toFixed(activeDecimals)} {tokenSymbol}</span>
                  </div>
                )}
                {fundingSource !== "native" && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="field-label">Gateway Balance</span>
                    <span className="data-value">{unifiedContribution.toFixed(activeDecimals)} {tokenSymbol}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mt-2">
                  <span className="field-label">Execution</span>
                  <span className="data-value">Multicall3From</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="field-label">Network</span>
                  <span className="data-value">Arc</span>
                </div>
              </div>
              <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded p-4 max-h-60 overflow-y-auto">
                <p className="field-label mb-2">Recipients</p>
                {pendingData.recipients.filter(r => r.address.trim() && r.amount.trim()).map((r, i) => (
                  <div key={i} className="receipt-row text-sm py-1.5 border-b border-[rgba(242,177,52,0.16)]/50 last:border-0">
                    <span className="receipt-address">{r.address.slice(0, 8)}…{r.address.slice(-6)}</span>
                    <span className="receipt-amount">{r.amount} {tokenSymbol}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { setShowReview(false); play("click"); }} className="flex-1 btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={executeSplit}
                  disabled={isSubmitDisabled}
                  className={`flex-1 btn-primary inline-flex items-center justify-center gap-1.5 ${isSubmitDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {arcSwitch.isMismatched ? "Switch to Arc" : isLoading ? "Processing…" : (
                    <>
                      <CheckCircle size={14} className="inline-block mr-1.5" />
                      Confirm & Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
