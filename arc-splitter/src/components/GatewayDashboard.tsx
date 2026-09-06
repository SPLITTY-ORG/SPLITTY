import { useState } from "react";
import { useAccount, useSwitchChain, useWriteContract, useReadContract, useSignTypedData } from "wagmi";
import { formatUnits, erc20Abi, parseUnits } from "viem";
import toast from "react-hot-toast";
import { toastSuccess, toastError, toastLoading, toastInfo } from "../lib/toast";
import { useGatewayBalance, useWalletBalance, useInvalidateBalances } from "../hooks/useBalances";
import { useSound } from "../hooks/useSound";
import { useChainSwitch } from "../hooks/useChainSwitch";
import { chainConfig, CHAIN_KEYS, GATEWAY_WALLET_ADDRESS } from "../config/gateway";
import { bridgeToArc, pollTransferStatus } from "../utils/gatewayBridge";
import { supabase } from "../lib/supabase";
import { ArrowDownToLine, ArrowRightLeft, Lightbulb } from "lucide-react";

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

export function GatewayDashboard() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { play } = useSound();
  const { invalidateWallet, invalidateGateway } = useInvalidateBalances();

  const [depositAmount, setDepositAmount] = useState("");
  const [depositChain, setDepositChain] = useState<keyof typeof chainConfig>("arc");
  const [isDepositing, setIsDepositing] = useState(false);

  const [bridgeAmount, setBridgeAmount] = useState("0.1");
  const [bridgeSource, setBridgeSource] = useState<keyof typeof chainConfig>("baseSepolia");
  const [isBridging, setIsBridging] = useState(false);

  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();

  const depositConfig = chainConfig[depositChain];
  const bridgeSourceConfig = chainConfig[bridgeSource];

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

  const arcGateway = useGatewayBalance(26);
  const baseGateway = useGatewayBalance(6);
  const ethGateway = useGatewayBalance(0);
  const gatewayBalances = [
    { domain: 26, balance: arcGateway.data },
    { domain: 6, balance: baseGateway.data },
    { domain: 0, balance: ethGateway.data },
  ];

  const sourceGatewayBalance = gatewayBalances.find(
    b => b.domain === bridgeSourceConfig.domainId
  );
  const sourceBalanceNum = sourceGatewayBalance?.balance
    ? parseFloat(sourceGatewayBalance.balance)
    : 0;

  const depositSwitch = useChainSwitch(depositChain);
  const bridgeSwitch = useChainSwitch(bridgeSource);

  const handleDeposit = async () => {
    if (!address) { toastError("Connect wallet first"); return; }
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) { toastError("Enter a valid amount"); return; }

    setIsDepositing(true);
    const amountWei = parseUnits(depositAmount, USDC_DECIMALS);
    try {
      if (!allowanceRaw || allowanceRaw < amountWei) {
        const approveToast = toastLoading(`Approving USDC on ${depositConfig.label}...`);
        await writeContractAsync({
          address: depositConfig.usdcAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [GATEWAY_WALLET_ADDRESS, amountWei],
          chainId: depositConfig.chainId,
        });
        await new Promise(r => setTimeout(r, 2000));
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
      toastError(err.message || "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleBridge = async () => {
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
    <div className="panel">
      {/* Gateway description section */}
      <div className="mb-6 p-4 bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded">
        <div className="flex items-start gap-3">
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

      <div className="flex items-center gap-2 mb-4">
        <span className="terminal-label">Gateway</span>
        <span className="text-xs text-[#9C917E] ml-2">// passive</span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="field-label">Unified Balance</span>
          <button
            onClick={() => {
              arcGateway.refetch();
              baseGateway.refetch();
              ethGateway.refetch();
              play("click");
            }}
            className="text-xs text-[#F2B134] hover:underline"
          >
            ⟳ refresh
          </button>
        </div>
        <div className="space-y-1">
          {gatewayBalances.map((b) => {
            const chainKey = Object.keys(chainConfig).find(
              k => chainConfig[k as keyof typeof chainConfig].domainId === b.domain
            ) || "unknown";
            return (
              <div key={b.domain} className="receipt-row text-sm py-1">
                <span className="receipt-address">{chainKey}</span>
                <span className="receipt-amount">{getDisplayBalance(b.balance)} USDC</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded p-4">
          <h4 className="field-label text-sm mb-3">Deposit USDC to Gateway</h4>
          {depositSwitch.isMismatched && (
            <div className="bg-[#C4553D]/10 border border-[#C4553D]/30 rounded p-2 mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[#C4553D] text-sm flex-1 min-w-[140px]">Switch to {depositSwitch.targetChain.label} to continue.</span>
              <button
                onClick={depositSwitch.switchChain}
                disabled={depositSwitch.isSwitching}
                className="btn-primary text-sm py-1 px-3 shrink-0"
              >
                {depositSwitch.isSwitching ? "Confirm in wallet…" : "Switch Network"}
              </button>
            </div>
          )}
          {depositSwitch.error && <div className="text-[#C4553D] text-xs mb-2">{depositSwitch.error}</div>}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <select
                value={depositChain}
                onChange={(e) => setDepositChain(e.target.value as keyof typeof chainConfig)}
                className="flex-1 select text-sm"
              >
                {CHAIN_KEYS.map((key) => (
                  <option key={key} value={key}>{chainConfig[key].label}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="flex-1 input text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {["0.1", "0.5", "1", "5", "10"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDepositAmount(preset)}
                  className="text-xs bg-[#1D1712] hover:bg-[#2F241A] text-[#9C917E] hover:text-[#EDE3D0] px-3 py-1 rounded border border-[rgba(242,177,52,0.16)] transition"
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
            <div className="text-xs text-[#9C917E] space-y-1">
              {depositBalanceRaw && (
                <div>Balance: <span className="data-value">{parseFloat(formatUnits(BigInt(depositBalanceRaw), USDC_DECIMALS)).toFixed(6)}</span> USDC on {depositConfig.label}</div>
              )}
              {allowanceRaw !== null && allowanceRaw !== undefined && (
                <div>Allowance: <span className="data-value">{parseFloat(formatUnits(allowanceRaw, USDC_DECIMALS)).toFixed(6)}</span> USDC</div>
              )}
              <div className="helper-text">USDC will be deposited into your unified Gateway balance.</div>
            </div>
          </div>
        </div>

        <div className="bg-[#241B14] border border-[rgba(242,177,52,0.16)] rounded p-4">
          <h4 className="field-label text-sm mb-3">INSTANT USDC BRIDGE TO ARC VIA GATEWAY BALANCE</h4>
          <p className="text-xs text-[#9C917E] mb-3">
            Move USDC from your Gateway balance to Arc — instant and gas‑efficient.
          </p>
          {bridgeSwitch.isMismatched && (
            <div className="bg-[#C4553D]/10 border border-[#C4553D]/30 rounded p-2 mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[#C4553D] text-sm flex-1 min-w-[140px]">Switch to {bridgeSwitch.targetChain.label} to continue.</span>
              <button
                onClick={bridgeSwitch.switchChain}
                disabled={bridgeSwitch.isSwitching}
                className="btn-primary text-sm py-1 px-3 shrink-0"
              >
                {bridgeSwitch.isSwitching ? "Confirm in wallet…" : "Switch Network"}
              </button>
            </div>
          )}
          {bridgeSwitch.error && <div className="text-[#C4553D] text-xs mb-2">{bridgeSwitch.error}</div>}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <select
                value={bridgeSource}
                onChange={(e) => setBridgeSource(e.target.value as keyof typeof chainConfig)}
                className="flex-1 select text-sm"
              >
                {CHAIN_KEYS.filter(k => k !== "arc").map((key) => (
                  <option key={key} value={key}>{chainConfig[key].label}</option>
                ))}
              </select>
              <span className="text-[#9C917E] text-sm">→ Arc</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={bridgeAmount}
                onChange={(e) => setBridgeAmount(e.target.value)}
                className="flex-1 input text-sm"
              />
              <span className="text-[#9C917E] text-sm self-center">USDC</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {["0.1", "0.5", "1", "5", "10"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBridgeAmount(preset)}
                  className="text-xs bg-[#1D1712] hover:bg-[#2F241A] text-[#9C917E] hover:text-[#EDE3D0] px-3 py-1 rounded border border-[rgba(242,177,52,0.16)] transition"
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
            <div className="helper-text text-xs">
              This will burn the entered amount from your Gateway balance on the selected chain, then mint it on Arc using Circle's Forwarding Service.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
