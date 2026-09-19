import { useState, useRef, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useSwitchChain,
  useReadContract,
} from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import toast from "react-hot-toast";
import { ChevronDown } from "lucide-react";
import { GATEWAY_WALLET_ADDRESS, chainConfig, CHAIN_KEYS, type ChainKey } from "../config/gateway";
import { ChainIcon } from "./ChainIcon";

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

const USDC_DECIMALS = 6;

// ── Custom chain picker ─────────────────────────────────────────────────────

interface ChainPickerProps {
  value: ChainKey;
  onChange: (key: ChainKey) => void;
}

function ChainPicker({ value, onChange }: ChainPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selected = chainConfig[value];

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-[#3A2F22] bg-[#1D1712] px-3 py-2 text-sm text-[#EDE3D0] transition hover:border-[rgba(242,177,52,0.4)] focus:outline-none"
      >
        <ChainIcon chainKey={value} size="sm" />
        <span className="font-mono text-xs">
          {selected.label}{" "}
          <span className="text-[#6B5F4F]">(Gateway)</span>
        </span>
        <ChevronDown
          size={13}
          className={`ml-1 text-[#6B5F4F] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[220px] rounded-lg border border-[#3A2F22] bg-[#1D1712] py-1 shadow-xl">
          {CHAIN_KEYS.map((key) => {
            const cfg = chainConfig[key];
            const active = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-[#29221A] ${
                  active ? "bg-[#29221A]" : ""
                }`}
              >
                <ChainIcon chainKey={key} size="sm" />
                <span className="font-mono text-xs text-[#EDE3D0]">
                  {cfg.label}{" "}
                  <span className="text-[#6B5F4F]">(Gateway)</span>
                </span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#F2B134]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function GatewayDeposit() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [selectedChainKey, setSelectedChainKey] = useState<ChainKey>("arc");

  const selectedConfig = chainConfig[selectedChainKey];
  const usdcAddress = selectedConfig.usdcAddress;

  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    token: usdcAddress,
    chainId: selectedConfig.chainId,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, GATEWAY_WALLET_ADDRESS] : undefined,
    chainId: selectedConfig.chainId,
  });

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: isApprovingWait } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: deposit, data: depositHash, isPending: isDepositingTx } = useWriteContract();
  const { isLoading: isDepositingWait } = useWaitForTransactionReceipt({ hash: depositHash });

  const totalPending = isApproving || isApprovingWait || isDepositingTx || isDepositingWait;

  const handleDeposit = async () => {
    if (!address) { toast.error("Connect wallet first"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }

    if (chainId !== selectedConfig.chainId) {
      const switchToast = toast.loading(`Switching to ${selectedConfig.label}...`);
      try {
        await switchChain({ chainId: selectedConfig.chainId });
        toast.success(`Switched to ${selectedConfig.label}`, { id: switchToast });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch {
        toast.error("Failed to switch network", { id: switchToast });
        return;
      }
    }

    const amountWei = parseUnits(amount, USDC_DECIMALS);
    setIsDepositing(true);
    try {
      if (!allowance || allowance < amountWei) {
        const approveToast = toast.loading(`Approving USDC on ${selectedConfig.label}...`);
        await approve({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [GATEWAY_WALLET_ADDRESS, amountWei],
          chainId: selectedConfig.chainId,
        });
        if (approveHash) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await refetchAllowance();
        }
        toast.success("USDC approved", { id: approveToast });
      }

      const depositToast = toast.loading(`Depositing into Gateway on ${selectedConfig.label}...`);
      await deposit({
        address: GATEWAY_WALLET_ADDRESS,
        abi: GATEWAY_WALLET_ABI,
        functionName: "deposit",
        args: [usdcAddress, amountWei],
        chainId: selectedConfig.chainId,
      });
      if (depositHash) {
        toast.success(`Deposit submitted on ${selectedConfig.label}! Wait for finality.`, { id: depositToast });
        await refetchBalance();
        await refetchAllowance();
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Deposit failed";
      toast.error(msg);
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#3A2F22] bg-[#1D1712]/70 p-4">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[#6B5F4F]">
        Deposit USDC from another chain to Gateway
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <ChainPicker value={selectedChainKey} onChange={setSelectedChainKey} />

        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 rounded-lg border border-[#3A2F22] bg-[#29221A] px-3 py-2 font-mono text-sm text-[#EDE3D0] placeholder-[#6B5F4F] focus:border-[rgba(242,177,52,0.4)] focus:outline-none"
        />

        <button
          onClick={handleDeposit}
          disabled={isDepositing || totalPending || !address}
          className={`rounded-lg px-4 py-2 font-mono text-sm font-bold transition ${
            isDepositing || totalPending || !address
              ? "cursor-not-allowed bg-[#29221A] text-[#6B5F4F]"
              : "bg-[#F2B134] text-[#15100B] hover:bg-[#FFC65A]"
          }`}
        >
          {isDepositing || totalPending ? "Processing…" : "Deposit"}
        </button>
      </div>

      {balanceData && (
        <p className="mt-2 font-mono text-[11px] text-[#6B5F4F]">
          Balance:{" "}
          <span className="text-[#9C917E]">
            {formatUnits(balanceData.value, USDC_DECIMALS)} USDC
          </span>{" "}
          on {selectedConfig.label}
        </p>
      )}
      {allowance !== undefined && (
        <p className="mt-1 font-mono text-[11px] text-[#6B5F4F]">
          Allowance:{" "}
          <span className="text-[#9C917E]">
            {formatUnits(allowance as bigint, USDC_DECIMALS)} USDC
          </span>
        </p>
      )}
      <p className="mt-2 font-mono text-[11px] text-[#6B5F4F]">
        USDC will be deposited into your unified Gateway balance.
      </p>
    </div>
  );
}
