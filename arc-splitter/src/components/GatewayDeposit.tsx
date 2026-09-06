import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  useSwitchChain,
  useReadContract,
} from "wagmi";
import { parseUnits, formatUnits, erc20Abi, type Address } from "viem";
import toast from "react-hot-toast";
import { GATEWAY_WALLET_ADDRESS, chainConfig, CHAIN_KEYS, type ChainKey } from "../config/gateway";

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

export function GatewayDeposit() {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [amount, setAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [selectedChainKey, setSelectedChainKey] = useState<ChainKey>("arc");

  const selectedConfig = chainConfig[selectedChainKey];
  const usdcAddress = selectedConfig.usdcAddress;

  // Read USDC balance on the selected chain
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    token: usdcAddress,
    chainId: selectedConfig.chainId,
  });

  // Read allowance
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
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    // Check if we are on the right chain
    if (chainId !== selectedConfig.chainId) {
      const switchToast = toast.loading(`Switching to ${selectedConfig.label}...`);
      try {
        await switchChain({ chainId: selectedConfig.chainId });
        toast.success(`Switched to ${selectedConfig.label}`, { id: switchToast });
        // Wait a moment for the chain to be fully switched
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        toast.error("Failed to switch network", { id: switchToast });
        return;
      }
    }

    const amountWei = parseUnits(amount, USDC_DECIMALS);

    setIsDepositing(true);
    try {
      // 1. Check allowance
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

      // 2. Deposit into Gateway Wallet
      const depositToast = toast.loading(`Depositing into Gateway on ${selectedConfig.label}...`);
      await deposit({
        address: GATEWAY_WALLET_ADDRESS,
        abi: GATEWAY_WALLET_ABI,
        functionName: "deposit",
        args: [usdcAddress, amountWei],
        chainId: selectedConfig.chainId,
      });
      if (depositHash) {
        toast.success(`Deposit submitted on ${selectedConfig.label}! Wait for finality.`, {
          id: depositToast,
        });
        // Refresh balance and allowance
        await refetchBalance();
        await refetchAllowance();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600">
      <p className="text-sm text-gray-300 mb-2">Deposit USDC from another chain to Gateway</p>
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedChainKey}
          onChange={(e) => setSelectedChainKey(e.target.value as ChainKey)}
          className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CHAIN_KEYS.map((key) => (
            <option key={key} value={key}>
              {chainConfig[key].label}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleDeposit}
          disabled={isDepositing || totalPending || !address}
          className={`px-4 py-2 rounded-lg font-bold transition ${
            isDepositing || totalPending || !address
              ? "bg-gray-600 cursor-not-allowed text-gray-400"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isDepositing || totalPending ? "Processing..." : "Deposit"}
        </button>
      </div>
      {balanceData && (
        <p className="text-xs text-gray-500 mt-1">
          Balance: {formatUnits(balanceData.value, USDC_DECIMALS)} USDC on {selectedConfig.label}
        </p>
      )}
      {allowance !== undefined && (
        <p className="text-xs text-gray-500 mt-1">
          Allowance: {formatUnits(allowance, USDC_DECIMALS)} USDC
        </p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        USDC will be deposited into your unified Gateway balance.
      </p>
    </div>
  );
}
