import { useState, useRef, useEffect } from "react";
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract, useSignTypedData } from "wagmi";
import { formatUnits, erc20Abi, parseUnits, createPublicClient, http, type Hash } from "viem";
import toast from "react-hot-toast";
import { toastSuccess, toastError, toastLoading, toastInfo } from "../lib/toast";
import { useGatewayBalance, useWalletBalance, useInvalidateBalances } from "../hooks/useBalances";
import { useSound } from "../hooks/useSound";
import { useChainSwitch } from "../hooks/useChainSwitch";
import {
  chainConfig,
  CHAIN_KEYS,
  BRIDGE_SOURCE_CHAIN_KEYS,
  GATEWAY_BALANCE_CHAIN_KEYS,
  FAST_DEPOSIT_ROUTES,
  GATEWAY_WALLET_ADDRESS,
} from "../config/gateway";
import { bridgeToArc, pollTransferStatus } from "../utils/gatewayBridge";
import { supabase } from "../lib/supabase";
import { ArrowDownToLine, Zap, ArrowRightLeft, Lightbulb, RefreshCw, ChevronUp, ChevronDown, ArrowRight, LoaderCircle } from "lucide-react";
import { ChainIcon } from "./ChainIcon";
import { UnifiedBalanceKit } from "@circle-fin/unified-balance-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

const USDC_DECIMALS = 6;

const GATEWAY_WALLET_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "token", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Singleton kit instance — no constructor args needed.
const kit = new UnifiedBalanceKit();

export function GatewayDashboard() {
  const { address, chainId, connector } = useAccount();

  const { switchChainAsync } = useSwitchChain();
  const { play } = useSound();
  const { invalidateWallet, invalidateGateway } = useInvalidateBalances();

  const [depositAmount, setDepositAmount] = useState("");
  const [fastDepositAmount, setFastDepositAmount] = useState("");
  const [depositMode, setDepositMode] = useState<"standard" | "fast">("standard");
  const [depositRouteOpen, setDepositRouteOpen] = useState(false);

  const depositRouteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!depositRouteOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        depositRouteRef.current &&
        !depositRouteRef.current.contains(e.target as Node)
      ) {
        setDepositRouteOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDepositRouteOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [depositRouteOpen]);

  const [depositChain, setDepositChain] = useState<keyof typeof chainConfig>("arc");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isFastDepositing, setIsFastDepositing] = useState(false);
  const [isEstimatingFastDeposit, setIsEstimatingFastDeposit] = useState(false);
  const [fastDepositEstimate, setFastDepositEstimate] = useState<any>(null);
  const [fastDepositRouteId, setFastDepositRouteId] = useState(
    FAST_DEPOSIT_ROUTES[0].id
  );

  const [bridgeAmount, setBridgeAmount] = useState("0.1");
  const [bridgeSource, setBridgeSource] = useState<keyof typeof chainConfig>("baseSepolia");
  const [isBridging, setIsBridging] = useState(false);




  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();

  const depositConfig = chainConfig[depositChain];
  const bridgeSourceConfig = chainConfig[bridgeSource];

  const fastDepositRoute =
    FAST_DEPOSIT_ROUTES.find((route) => route.id === fastDepositRouteId) ??
    FAST_DEPOSIT_ROUTES[0];

  const fastSourceConfig = chainConfig[fastDepositRoute.sourceKey];
  const fastDestinationConfig = chainConfig[fastDepositRoute.destinationKey];

  const { data: depositBalanceRaw, refetch: refetchDepositBalance } = useWalletBalance(
    depositConfig.usdcAddress,
    depositConfig.chainId
  );

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: depositConfig.usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, GATEWAY_WALLET_ADDRESS] : undefined,
    chainId: depositConfig.chainId,
  });

  const { data: fastDepositBalanceRaw } = useWalletBalance(
    fastSourceConfig.usdcAddress,
    fastSourceConfig.chainId
  );

  const { data: fastDepositAllowanceRaw } = useReadContract({
    address: fastSourceConfig.usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, GATEWAY_WALLET_ADDRESS] : undefined,
    chainId: fastSourceConfig.chainId,
  });

  const arcGateway = useGatewayBalance(chainConfig.arc.domainId);
  const baseGateway = useGatewayBalance(chainConfig.baseSepolia.domainId);
  const ethGateway = useGatewayBalance(chainConfig.ethereumSepolia.domainId);
  const avalancheGateway = useGatewayBalance(chainConfig.avalancheFuji.domainId);
  const polygonGateway = useGatewayBalance(chainConfig.polygonAmoy.domainId);

  const gatewayBalances = [
    { domain: chainConfig.arc.domainId, balance: arcGateway.data },
    { domain: chainConfig.baseSepolia.domainId, balance: baseGateway.data },
    { domain: chainConfig.ethereumSepolia.domainId, balance: ethGateway.data },
    { domain: chainConfig.avalancheFuji.domainId, balance: avalancheGateway.data },
    { domain: chainConfig.polygonAmoy.domainId, balance: polygonGateway.data },
  ];

  const sourceGatewayBalance = gatewayBalances.find(
    b => b.domain === bridgeSourceConfig.domainId
  );
  const sourceBalanceNum = sourceGatewayBalance?.balance
    ? parseFloat(sourceGatewayBalance.balance)
    : 0;

  const depositSwitch = useChainSwitch(depositChain);
  const fastDepositSwitch = useChainSwitch(fastDepositRoute.sourceKey);
  const bridgeSwitch = useChainSwitch(bridgeSource);

  // Shared adapter factory — uses wagmi connector's EIP-1193 provider.
  const getAdapter = async () => {
    if (!connector) throw new Error("Wallet not connected");
    const provider = await connector.getProvider() as import("viem").EIP1193Provider;
    return await createViemAdapterFromProvider({ provider });
  };




  const handleFastDeposit = async () => {
    play("confirm");
    if (!address) { toastError("Connect wallet first"); return; }
    const amt = parseFloat(fastDepositAmount);
    if (!amt || amt <= 0) { toastError("Enter a valid amount"); return; }

    setIsFastDepositing(true);
    const depositToast = toastLoading(
      `Fast depositing ${fastDepositAmount} USDC from ${fastSourceConfig.label} to ${fastDestinationConfig.label}...`
    );

    try {
      const adapter = await getAdapter();

      const result = await kit.deposit({
        from: { adapter, chain: fastDepositRoute.sourceChain },
        amount: fastDepositAmount,
        token: "USDC",
      });

      toast.dismiss(depositToast);

      const status = result.progress.status;

      if (status === "DONE") {
        toastSuccess("Fast deposit complete");

        await supabase.from("transaction_history").insert({
          wallet_address: address,
          event_type: "gateway_fast_deposit",
          data: {
            sourceChain: fastSourceConfig.label,
            destinationChain: fastDestinationConfig.label,
            amount: fastDepositAmount,
            token: "USDC",
            status: "DONE",
          },
          tx_hash: result.txHash,
        });

        play("success");
      } else if (status === "PENDING") {
        toastInfo(
          "Fast deposit is still pending. Do not submit another deposit yet."
        );

        await supabase.from("transaction_history").insert({
          wallet_address: address,
          event_type: "gateway_fast_deposit",
          data: {
            sourceChain: fastSourceConfig.label,
            destinationChain: fastDestinationConfig.label,
            amount: fastDepositAmount,
            token: "USDC",
            status: "PENDING",
          },
          tx_hash: result.txHash,
        });
      } else {
        toastError("Fast deposit failed");

        await supabase.from("transaction_history").insert({
          wallet_address: address,
          event_type: "gateway_fast_deposit",
          data: {
            sourceChain: fastSourceConfig.label,
            destinationChain: fastDestinationConfig.label,
            amount: fastDepositAmount,
            token: "USDC",
            status: "FAILED",
          },
          tx_hash: result.txHash,
        });
      }

      setTimeout(() => {
        invalidateGateway(fastDestinationConfig.domainId);
        invalidateGateway(fastSourceConfig.domainId);
        invalidateWallet(
          fastSourceConfig.chainId,
          fastSourceConfig.usdcAddress
        );
        invalidateWallet(
          fastDestinationConfig.chainId,
          fastDestinationConfig.usdcAddress
        );
      }, 3000);

      setFastDepositEstimate(null);
      setFastDepositAmount("");
    } catch (err: any) {
      toastError(err?.message || "Fast deposit failed");
    } finally {
      setIsFastDepositing(false);
    }
  };

  const handleEstimateFastDeposit = handleFastDeposit;
  const handleExecuteFastDeposit = handleFastDeposit;

  const handleDeposit = async () => {
    play("confirm");
    if (!address) { toastError("Connect wallet first"); return; }
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) { toastError("Enter a valid amount"); return; }

    const depositBalanceNum = depositBalanceRaw
      ? parseFloat(formatUnits(BigInt(depositBalanceRaw), USDC_DECIMALS))
      : 0;
    if (amt > depositBalanceNum) {
      toastError(`Insufficient balance. You have ${depositBalanceNum.toFixed(6)} USDC on ${depositConfig.label}.`);
      return;
    }

    setIsDepositing(true);
    const amountWei = parseUnits(depositAmount, USDC_DECIMALS);

    // Build a public client for this chain to wait for receipts.
    const publicClient = createPublicClient({
      chain: depositConfig.chain,
      transport: http(),
    });

    try {
      if (!allowanceRaw || allowanceRaw < amountWei) {
        const approveToast = toastLoading(`Approving USDC on ${depositConfig.label}...`);
        const approveTx = await writeContractAsync({
          address: depositConfig.usdcAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [GATEWAY_WALLET_ADDRESS, amountWei],
          chainId: depositConfig.chainId,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
        toast.dismiss(approveToast);
        if (approveReceipt.status !== "success") {
          throw new Error("Approval transaction reverted — deposit cancelled.");
        }
        await refetchAllowance();
        toastSuccess("Approved");
      }

      const depositToast = toastLoading(`Depositing into Gateway on ${depositConfig.label}...`);
      const tx = await writeContractAsync({
        address: GATEWAY_WALLET_ADDRESS,
        abi: GATEWAY_WALLET_ABI,
        functionName: "deposit",
        args: [depositConfig.usdcAddress, amountWei],
        chainId: depositConfig.chainId,
      });
      toast.dismiss(depositToast);
      toastSuccess("Deposit submitted! Waiting for finality.");
      play("click");

      await supabase.from("transaction_history").insert({
        wallet_address: address,
        event_type: "gateway_deposit",
        data: {
          sourceChain: depositConfig.label,
          sourceDomain: depositConfig.domainId,
          amount: amt,
          token: depositConfig.usdcAddress,
        },
        tx_hash: tx,
      });

      setTimeout(async () => {
        await refetchDepositBalance();
        await refetchAllowance();
        invalidateGateway(depositConfig.domainId);
        invalidateWallet(depositConfig.chainId, depositConfig.usdcAddress);
      }, 3000);
    } catch (err: any) {
      const message = err?.message || "";
      const isUserRejected =
        /user rejected|user denied|user cancelled|user canceled|rejected the request|denied the request/i.test(
          message
        );

      if (isUserRejected) {
        toastInfo("Deposit cancelled");
      } else {
        toastError(message || "Deposit failed");
      }
    } finally {
      setIsDepositing(false);
    }
  };

  const handleBridge = async () => {
    play("confirm");
    if (!address) { toastError("Connect wallet first"); return; }
    const amt = parseFloat(bridgeAmount);
    if (!amt || amt <= 0) { toastError("Enter a valid amount"); return; }
    if (sourceBalanceNum < amt) {
      toastError(`Insufficient Gateway balance on ${bridgeSourceConfig.label}`);
      return;
    }

    setIsBridging(true);
    try {
      const { transferId } = await bridgeToArc(
        address,
        signTypedDataAsync,
        bridgeSource,
        amt,
        (msg) => toastLoading(msg)
      );
      toastSuccess(`Bridge initiated! Transfer ID: ${transferId}`);
      play("click");

      await supabase.from("transaction_history").insert({
        wallet_address: address,
        event_type: "bridge_to_arc",
        data: {
          sourceChain: bridgeSourceConfig.label,
          sourceDomain: bridgeSourceConfig.domainId,
          amount: amt,
          transferId,
        },
        tx_hash: transferId,
      });

      invalidateGateway(bridgeSourceConfig.domainId);

      const result = await pollTransferStatus(transferId, 180000);
      if (result.status === "finalized" || result.status === "confirmed") {
        toastSuccess(`Bridge completed!`);
        invalidateGateway(bridgeSourceConfig.domainId);
        invalidateGateway(26);
        invalidateWallet(5042002, chainConfig.arc.usdcAddress);
      } else {
        toastInfo("Bridge submitted but finality not yet confirmed.");
      }
    } catch (err: any) {
      toastError(err.message || "Bridge failed");
    } finally {
      setIsBridging(false);
    }
  };

  const getDisplayBalance = (b: string | undefined) =>
    b ? parseFloat(b).toFixed(6) : "0.000000";

  return (
    <div className="panel w-full min-w-0 overflow-hidden">
      {/* Gateway description section */}
      <div className="mb-5 sm:mb-6 p-3 sm:p-4 bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded overflow-hidden">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
          <Lightbulb size={18} className="text-[#F2B134] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-[#EDE3D0]">What is the Gateway?</h3>
            <p className="text-xs text-[#9C917E] mt-1 leading-relaxed">
              The Gateway is like a <span className="text-[#F2B134]">unified wallet</span> that holds your USDC
              across multiple blockchains. You can <span className="text-[#F2B134]">deposit</span> USDC from other chains
              (like Base or Ethereum Sepolia) into your Gateway balance, then <span className="text-[#F2B134]">bridge</span> it to Arc
              instantly — all without paying high gas fees per transfer.
            </p>
            <p className="text-xs text-[#6B5F4F] mt-1">
              <span className="text-[#9C917E]">Tip:</span> Your Gateway balance appears in the <span className="text-[#EDE3D0]">Unified Balance</span> on the Split tab.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="terminal-label">Gateway</span>
        <span className="text-xs text-[#9C917E] ml-2">// passive</span>
      </div>

      <div className="mb-5 sm:mb-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="field-label">Unified Balance</span>
          <button
            onClick={() => {
              arcGateway.refetch();
              baseGateway.refetch();
              ethGateway.refetch();
              avalancheGateway.refetch();
              polygonGateway.refetch();
              play("click");
            }}
            className="text-xs text-[#F2B134] hover:underline"
          >
            <RefreshCw size={12} className="inline-block mr-1" /> refresh
          </button>
        </div>
        <div className="space-y-1 min-w-0">
          {gatewayBalances.map((b) => {
            const chainKey = Object.keys(chainConfig).find(
              k => chainConfig[k as keyof typeof chainConfig].domainId === b.domain
            ) as keyof typeof chainConfig | undefined;
            const chainLabel = chainKey ? chainConfig[chainKey].label : "Unknown";
            return (
              <div key={b.domain} className="receipt-row text-sm py-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 min-w-0">
                <span className="receipt-address min-w-0 truncate flex items-center gap-1.5">
                  {chainKey && <ChainIcon chainKey={chainKey} size={13} />}
                  {chainLabel}
                </span>
                <span className="receipt-amount shrink-0">{getDisplayBalance(b.balance)} USDC</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-5 sm:mb-6 bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded p-3 sm:p-4 min-w-0 overflow-visible">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h4 className="field-label text-sm">Gateway Deposit</h4>
            <p className="text-xs text-[#6B5F4F] mt-1">
              Choose how you want to fund your Unified Balance.
            </p>
          </div>
        </div>

        <div className="relative mb-4 min-w-0" ref={depositRouteRef}>
          <div className="text-[10px] uppercase tracking-wider text-[#6B5F4F] mb-1.5">
            Deposit route
          </div>
          <button
            type="button"
            onClick={() => { setDepositRouteOpen((open) => !open); play("click"); }}
            aria-haspopup="listbox"
            aria-expanded={depositRouteOpen}
            className={`w-full min-w-0 flex items-center justify-between gap-2 sm:gap-3 bg-[#1D1712] border rounded px-3 py-3 text-sm transition ${depositRouteOpen ? "border-[rgba(242,177,52,0.42)]" : "border-[rgba(242,177,52,0.18)] hover:border-[rgba(242,177,52,0.35)]"}`}
          >
            <span className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
              {depositMode === "fast" ? (
                <>
                  <span className="truncate min-w-0 flex items-center gap-1.5">
                    <ChainIcon chainKey={fastDepositRoute?.from ?? ""} size={14} />
                    {fastSourceConfig.label}
                    <ArrowRight size={12} className="shrink-0" />
                    <ChainIcon chainKey={fastDepositRoute?.to ?? ""} size={14} />
                    {fastDestinationConfig.label}
                  </span>
                  <span className="flex items-center gap-1 text-[#F2B134] shrink-0">
                    <Zap size={13} />
                    <span className="text-xs">40x faster</span>
                  </span>
                </>
              ) : (
                <span className="truncate flex items-center gap-1.5">
                  <ChainIcon chainKey={depositChain} size={14} />
                  {chainConfig[depositChain].label}
                  <ArrowRight size={12} className="shrink-0" />
                  Gateway
                </span>
              )}
            </span>

            <span className="text-[#9C917E] shrink-0">
              {depositRouteOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {depositRouteOpen && (
            <div role="listbox" className="absolute z-30 left-0 right-0 mt-1 bg-[#1D1712] border border-[rgba(242,177,52,0.22)] rounded overflow-hidden shadow-xl max-h-[60vh] overflow-y-auto">
              {CHAIN_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={depositMode === "standard" && depositChain === key}
                  onClick={() => {
                    setDepositMode("standard");
                    setDepositChain(key);
                    setFastDepositEstimate(null);
                    setDepositRouteOpen(false);
                    play("tab");
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-3 sm:py-2.5 text-left text-sm transition hover:bg-[#2F241A] ${
                    depositMode === "standard" && depositChain === key
                      ? "text-[#F2B134]"
                      : "text-[#EDE3D0]"
                  }`}
                >
                  <span className="flex items-center gap-1.5"><ChainIcon chainKey={key} size={14} />{chainConfig[key].label} <ArrowRight size={12} className="shrink-0" /> Gateway</span>
                  <span className="text-xs text-[#6B5F4F]">standard</span>
                </button>
              ))}

              <div className="border-t border-[rgba(242,177,52,0.10)]" />

              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#6B5F4F]">
                Fast Deposit
              </div>

              {FAST_DEPOSIT_ROUTES.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  role="option"
                  aria-selected={depositMode === "fast" && fastDepositRouteId === route.id}
                  onClick={() => {
                    setDepositMode("fast");
                    setFastDepositRouteId(route.id);
                    setFastDepositEstimate(null);
                    setDepositRouteOpen(false);
                    play("tab");
                  }}
                  className={`w-full flex items-center justify-between gap-2 sm:gap-3 px-3 py-3 sm:py-2.5 text-left text-sm transition hover:bg-[#2F241A] ${
                    depositMode === "fast" && fastDepositRouteId === route.id
                      ? "text-[#F2B134]"
                      : "text-[#EDE3D0]"
                  }`}
                >
                  <span className="truncate">{route.label}</span>
                  <span className="flex items-center gap-1 text-[#F2B134] text-xs shrink-0">
                    <Zap size={13} />
                    40x
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {depositMode === "fast" ? (
          <>
            {fastDepositSwitch.isMismatched && (
              <div className="bg-[#C4553D]/10 border border-[#C4553D]/30 rounded p-2.5 mb-3 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                <span className="text-[#C4553D] text-sm flex-1 min-w-0 leading-relaxed">
                  Switch to {fastSourceConfig.label} to continue.
                </span>
                <button
                  onClick={() => { play("confirm"); fastDepositSwitch.switchChain(); }}
                  disabled={fastDepositSwitch.isSwitching}
                  className="btn-primary text-sm py-2 px-3 w-full sm:w-auto shrink-0"
                >
                  {fastDepositSwitch.isSwitching ? "Confirm in wallet…" : "Switch Network"}
                </button>
              </div>
            )}

            {fastDepositSwitch.error && (
              <div className="text-[#C4553D] text-xs mb-2">
                {fastDepositSwitch.error}
              </div>
            )}

            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex gap-2 min-w-0">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={fastDepositAmount}
                  onChange={(e) => {
                    setFastDepositAmount(e.target.value);
                    setFastDepositEstimate(null);
                  }}
                  className="w-full min-w-0 flex-1 input text-sm h-10"
                />
                {fastDepositBalanceRaw !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      const max = parseFloat(formatUnits(fastDepositBalanceRaw, USDC_DECIMALS)).toFixed(6);
                      setFastDepositAmount(max);
                      setFastDepositEstimate(null);
                      play("step");
                    }}
                    className="text-xs shrink-0 px-3 h-10 rounded border border-[rgba(242,177,52,0.25)] text-[#F2B134] hover:bg-[rgba(242,177,52,0.08)] transition"
                  >
                    MAX
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap">
                {["0.1", "0.5", "1", "5", "10"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setFastDepositAmount(preset);
                      setFastDepositEstimate(null);
                      play("step");
                    }}
                    className="text-xs bg-[#1D1712] hover:bg-[#2F241A] text-[#9C917E] hover:text-[#EDE3D0] px-2.5 py-2 sm:px-3 sm:py-1 rounded border border-[rgba(242,177,52,0.16)] transition text-center min-w-0"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {fastDepositEstimate && (
                <>
                  <div className="mt-1 p-3 bg-[#1D1712] border border-[rgba(242,177,52,0.12)] rounded min-w-0 overflow-hidden">
                    <div className="text-xs text-[#9C917E] mb-2">
                      Estimated fees
                    </div>

                    {fastDepositEstimate.fees?.map((fee: any, index: number) => (
                      <div key={index} className="receipt-row text-xs py-1">
                        <span className="receipt-address">
                          {fee.type || "Fee"}
                        </span>
                        <span className="receipt-amount">
                          {fee.amount || "0"} {fee.token || "USDC"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setFastDepositEstimate(null); play("click"); }}
                    disabled={isFastDepositing}
                    className="w-full text-xs text-[#6B5F4F] hover:text-[#EDE3D0] transition py-1"
                  >
                    Edit amount
                  </button>
                </>
              )}

              <button
                onClick={
                  fastDepositEstimate
                    ? handleExecuteFastDeposit
                    : handleEstimateFastDeposit
                }
                disabled={
                  fastDepositSwitch.isMismatched ||
                  fastDepositSwitch.isSwitching ||
                  isFastDepositing ||
                  isEstimatingFastDeposit ||
                  !address ||
                  !fastDepositAmount
                }
                className={`btn-primary w-full flex items-center justify-center gap-2 ${
                  isEstimatingFastDeposit ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                {isFastDepositing ? (
                  "Processing…"
                ) : isEstimatingFastDeposit ? (
                  "Reviewing…"
                ) : fastDepositEstimate ? (
                  <>
                    <Zap size={14} />
                    Fast Deposit
                  </>
                ) : (
                  "Review Fast Deposit"
                )}
              </button>



              <div className="mt-2 text-xs text-[#6B5F4F] space-y-1 break-words leading-relaxed">
                <div>
                  Balance:{" "}
                  <span className="data-value">
                    {fastDepositBalanceRaw !== undefined
                      ? parseFloat(formatUnits(fastDepositBalanceRaw, USDC_DECIMALS)).toFixed(6)
                      : "0.000000"}
                  </span>{" "}
                  USDC on {fastSourceConfig.label}
                </div>

                <div>
                  Allowance:{" "}
                  <span className="data-value">
                    {fastDepositAllowanceRaw !== undefined
                      ? parseFloat(formatUnits(fastDepositAllowanceRaw, USDC_DECIMALS)).toFixed(6)
                      : "0.000000"}
                  </span>{" "}
                  USDC
                </div>

                <div className="pt-1">
                  USDC will be deposited into your unified Gateway balance.
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="">
            <h4 className="field-label text-sm mb-3 leading-relaxed">Deposit USDC to Gateway</h4>
            {depositSwitch.isMismatched && (
              <div className="bg-[#C4553D]/10 border border-[#C4553D]/30 rounded p-2.5 mb-3 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                <span className="text-[#C4553D] text-sm flex-1 min-w-0 leading-relaxed">Switch to {depositSwitch.targetChain.label} to continue.</span>
                <button
                  onClick={() => { play("confirm"); depositSwitch.switchChain(); }}
                  disabled={depositSwitch.isSwitching}
                  className="btn-primary text-sm py-2 px-3 w-full sm:w-auto shrink-0"
                >
                  {depositSwitch.isSwitching ? "Confirm in wallet…" : "Switch Network"}
                </button>
              </div>
            )}
            {depositSwitch.error && <div className="text-[#C4553D] text-xs mb-2">{depositSwitch.error}</div>}
            <div className="flex flex-col gap-3 min-w-0">
              <div className="flex gap-2 min-w-0">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full min-w-0 flex-1 input text-sm h-10"
                />
                {depositBalanceRaw && (
                  <button
                    type="button"
                    onClick={() => {
                      setDepositAmount(parseFloat(formatUnits(depositBalanceRaw, USDC_DECIMALS)).toFixed(6));
                      play("step");
                    }}
                    className="text-xs shrink-0 px-3 h-10 rounded border border-[rgba(242,177,52,0.25)] text-[#F2B134] hover:bg-[rgba(242,177,52,0.08)] transition"
                  >
                    MAX
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap">
                {["0.1", "0.5", "1", "5", "10"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { setDepositAmount(preset); play("step"); }}
                    className="text-xs bg-[#1D1712] hover:bg-[#2F241A] text-[#9C917E] hover:text-[#EDE3D0] px-2.5 py-2 sm:px-3 sm:py-1 rounded border border-[rgba(242,177,52,0.16)] transition text-center min-w-0"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <button
                onClick={handleDeposit}
                disabled={depositSwitch.isMismatched || depositSwitch.isSwitching || isDepositing || !address}
                className={`btn-primary w-full inline-flex items-center justify-center gap-1.5 ${(depositSwitch.isMismatched || depositSwitch.isSwitching || isDepositing || !address) ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {isDepositing ? "Depositing…" : (
                  <>
                    <ArrowDownToLine size={14} />
                    Deposit to Gateway
                  </>
                )}
              </button>
              <div className="text-xs text-[#9C917E] space-y-1 break-words leading-relaxed">
                {depositBalanceRaw && (
                  <div>Balance: <span className="data-value">{parseFloat(formatUnits(depositBalanceRaw, USDC_DECIMALS)).toFixed(6)}</span> USDC on {depositConfig.label}</div>
                )}
                {allowanceRaw !== null && allowanceRaw !== undefined && (
                  <div>Allowance: <span className="data-value">{parseFloat(formatUnits(allowanceRaw, USDC_DECIMALS)).toFixed(6)}</span> USDC</div>
                )}
                <div className="helper-text">USDC will be deposited into your unified Gateway balance.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded p-3 sm:p-4 min-w-0 overflow-hidden">
        <h4 className="field-label text-sm mb-3 leading-relaxed break-words">INSTANT USDC BRIDGE TO ARC VIA GATEWAY BALANCE</h4>
        <p className="text-xs text-[#9C917E] mb-3 leading-relaxed">
          Move USDC from your Gateway balance to Arc — instant and gas‑efficient.
        </p>
        {bridgeSwitch.isMismatched && (
          <div className="bg-[#C4553D]/10 border border-[#C4553D]/30 rounded p-2.5 mb-3 flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <span className="text-[#C4553D] text-sm flex-1 min-w-0 leading-relaxed">Switch to {bridgeSwitch.targetChain.label} to continue.</span>
            <button
              onClick={() => { play("confirm"); bridgeSwitch.switchChain(); }}
              disabled={bridgeSwitch.isSwitching}
              className="btn-primary text-sm py-2 px-3 w-full sm:w-auto shrink-0"
            >
              {bridgeSwitch.isSwitching ? "Confirm in wallet…" : "Switch Network"}
            </button>
          </div>
        )}
        {bridgeSwitch.error && <div className="text-[#C4553D] text-xs mb-2">{bridgeSwitch.error}</div>}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center min-w-0">
            <select
              value={bridgeSource}
              onChange={(e) => setBridgeSource(e.target.value as keyof typeof chainConfig)}
              className="flex-1 select text-sm"
            >
              {BRIDGE_SOURCE_CHAIN_KEYS.map((key) => (
                <option key={key} value={key}>{chainConfig[key].label}</option>
              ))}
            </select>
            <span className="text-[#9C917E] text-sm shrink-0 flex items-center gap-1.5"><ArrowRight size={12} /><ChainIcon chainKey="arc" size={14} /> Arc</span>
          </div>
          <div className="flex gap-2 min-w-0 items-center">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Amount"
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(e.target.value)}
              className="w-full min-w-0 flex-1 input text-sm h-10"
            />
            {sourceBalanceNum > 0 && (
              <button
                type="button"
                onClick={() => { setBridgeAmount(sourceBalanceNum.toFixed(6)); play("step"); }}
                className="text-xs shrink-0 px-3 h-10 rounded border border-[rgba(242,177,52,0.25)] text-[#F2B134] hover:bg-[rgba(242,177,52,0.08)] transition"
              >
                MAX
              </button>
            )}
            <span className="text-[#9C917E] text-sm shrink-0">USDC</span>
          </div>
          {sourceBalanceNum === 0 && (
            <div className="text-xs text-[#C4553D] bg-[#C4553D]/10 border border-[#C4553D]/20 rounded px-3 py-2">
              No Gateway balance on {bridgeSourceConfig.label}. Deposit first before bridging.
            </div>
          )}
          <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap">
            {["0.1", "0.5", "1", "5", "10"].map((preset) => (
              <button
                key={preset}
                onClick={() => { setBridgeAmount(preset); play("step"); }}
                className="text-xs bg-[#1D1712] hover:bg-[#2F241A] text-[#9C917E] hover:text-[#EDE3D0] px-2.5 py-2 sm:px-3 sm:py-1 rounded border border-[rgba(242,177,52,0.16)] transition text-center min-w-0"
              >
                {preset}
              </button>
            ))}
          </div>
          {sourceGatewayBalance && (
            <div className="text-xs text-[#9C917E]">Gateway balance: <span className="data-value">{getDisplayBalance(sourceGatewayBalance.balance)}</span> USDC on {bridgeSourceConfig.label}</div>
          )}
          <button
            onClick={handleBridge}
            disabled={bridgeSwitch.isMismatched || bridgeSwitch.isSwitching || isBridging || !address}
            className={`btn-secondary w-full inline-flex items-center justify-center gap-1.5 ${(bridgeSwitch.isMismatched || bridgeSwitch.isSwitching || isBridging || !address) ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {isBridging ? "Bridging…" : (
              <>
                <ArrowRightLeft size={14} />
                Bridge
              </>
            )}
          </button>
          <div className="helper-text text-xs leading-relaxed break-words">
            This will burn the entered amount from your Gateway balance on the selected chain, then mint it on Arc using Circle's Forwarding Service.
          </div>
        </div>
      </div>
    </div>
  );
}
