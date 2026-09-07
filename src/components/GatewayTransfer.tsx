import { useState } from "react";
import { useAccount, useSwitchChain, useSignTypedData } from "wagmi";
import { parseUnits, pad, zeroAddress, type Hex } from "viem";
import toast from "react-hot-toast";
import { GATEWAY_WALLET_ADDRESS, GATEWAY_MINTER_ADDRESS, GATEWAY_API_BASE, chainConfig, CHAIN_KEYS } from "../config/gateway";
import { useGatewayBalance } from "../hooks/useGatewayBalance";

function stringifyWithBigInts(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

function randomBytes32(): Hex {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return `0x${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

const MAX_FEE = 2_010000n;

const domain = { name: "GatewayWallet", version: "1" };
const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
] as const;

const TransferSpec = [
  { name: "version", type: "uint32" },
  { name: "sourceDomain", type: "uint32" },
  { name: "destinationDomain", type: "uint32" },
  { name: "sourceContract", type: "bytes32" },
  { name: "destinationContract", type: "bytes32" },
  { name: "sourceToken", type: "bytes32" },
  { name: "destinationToken", type: "bytes32" },
  { name: "sourceDepositor", type: "bytes32" },
  { name: "destinationRecipient", type: "bytes32" },
  { name: "sourceSigner", type: "bytes32" },
  { name: "destinationCaller", type: "bytes32" },
  { name: "value", type: "uint256" },
  { name: "salt", type: "bytes32" },
  { name: "hookData", type: "bytes" },
] as const;

const BurnIntent = [
  { name: "maxBlockHeight", type: "uint256" },
  { name: "maxFee", type: "uint256" },
  { name: "spec", type: "TransferSpec" },
] as const;

export function GatewayTransfer() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { balances, refetch: refetchBalances } = useGatewayBalance();
  const [isTransferring, setIsTransferring] = useState(false);
  const [sourceChainKey, setSourceChainKey] = useState<keyof typeof chainConfig>("baseSepolia");
  const [amount, setAmount] = useState("0.1");
  const [transferId, setTransferId] = useState<string | null>(null);

  const { signTypedDataAsync } = useSignTypedData();

  const handleTransfer = async () => {
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const sourceConfig = chainConfig[sourceChainKey];
    const sourceDomain = sourceConfig.domainId;
    const sourceBalance = balances.find(b => b.domain === sourceDomain);
    console.log("Balances:", balances);
    console.log("Source balance:", sourceBalance);

    if (!sourceBalance) {
      toast.error(`No Gateway balance found for ${sourceConfig.label}`);
      return;
    }
    const balanceNum = parseFloat(sourceBalance.balance);
    if (balanceNum < amt) {
      toast.error(`Insufficient Gateway balance on ${sourceConfig.label}: ${balanceNum} USDC`);
      return;
    }

    setIsTransferring(true);
    setTransferId(null);

    try {
      // --- Network switching with better UX ---
      if (chainId !== sourceConfig.chainId) {
        const switchToast = toast.loading(`Switching to ${sourceConfig.label}...`);
        try {
          await switchChainAsync({ chainId: sourceConfig.chainId });
          toast.success(`Switched to ${sourceConfig.label}`, { id: switchToast });
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (switchErr: any) {
          // If the chain is not in the wallet, we can't switch automatically.
          // We'll show a message asking the user to add it manually.
          toast.error(`Please switch to ${sourceConfig.label} (Chain ID: ${sourceConfig.chainId}) manually in your wallet.`, { id: switchToast });
          setIsTransferring(false);
          return;
        }
      }

      const destConfig = chainConfig.arc;
      const sourceToken = sourceConfig.usdcAddress;
      const destToken = destConfig.usdcAddress;

      const value = parseUnits(amt.toString(), 6);
      const maxBlockHeight = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      const salt = randomBytes32();

      const spec = {
        version: 1,
        sourceDomain: sourceConfig.domainId,
        destinationDomain: destConfig.domainId,
        sourceContract: pad(GATEWAY_WALLET_ADDRESS.toLowerCase() as Hex, { size: 32 }),
        destinationContract: pad(GATEWAY_MINTER_ADDRESS.toLowerCase() as Hex, { size: 32 }),
        sourceToken: pad(sourceToken.toLowerCase() as Hex, { size: 32 }),
        destinationToken: pad(destToken.toLowerCase() as Hex, { size: 32 }),
        sourceDepositor: pad(address.toLowerCase() as Hex, { size: 32 }),
        destinationRecipient: pad(address.toLowerCase() as Hex, { size: 32 }),
        sourceSigner: pad(address.toLowerCase() as Hex, { size: 32 }),
        destinationCaller: pad(zeroAddress as Hex, { size: 32 }),
        value,
        salt,
        hookData: "0x" as Hex,
      };

      const estimateUrl = `${GATEWAY_API_BASE}/v1/estimate?enableForwarder=true`;
      const estimateBody = stringifyWithBigInts([{ spec }]);
      console.log("Estimate request:", estimateUrl, estimateBody);
      const estimateRes = await fetch(estimateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: estimateBody,
      });
      if (!estimateRes.ok) {
        const text = await estimateRes.text();
        console.error("Estimate failed:", text);
        throw new Error(`Estimate error: ${estimateRes.status} ${text}`);
      }
      const estimateJson = await estimateRes.json();
      console.log("Estimate response:", estimateJson);
      const estimated = estimateJson.body?.[0]?.burnIntent;
      if (!estimated) throw new Error("Missing estimate");
      const maxFee = BigInt(estimated.maxFee);
      const maxBlockHeightEst = BigInt(estimated.maxBlockHeight);

      const burnIntent = { maxBlockHeight: maxBlockHeightEst, maxFee, spec };

      const typedData = {
        types: { EIP712Domain, TransferSpec, BurnIntent },
        domain,
        primaryType: "BurnIntent" as const,
        message: burnIntent,
      };

      console.log("Typed data to sign:", typedData);
      toast.loading("Please sign the burn intent in your wallet...");
      const signature = await signTypedDataAsync(typedData);
      console.log("Signature:", signature);
      toast.dismiss();

      const transferUrl = `${GATEWAY_API_BASE}/v1/transfer?enableForwarder=true`;
      const transferBody = stringifyWithBigInts([
        {
          burnIntent: typedData.message,
          signature,
        },
      ]);
      console.log("Transfer request:", transferUrl, transferBody);
      const response = await fetch(transferUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: transferBody,
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Transfer failed:", text);
        throw new Error(`Gateway API error: ${response.status} ${text}`);
      }
      const json = await response.json();
      console.log("Transfer response:", json);
      const id = json.transferId;
      if (!id) throw new Error("Missing transfer ID");
      setTransferId(id);
      toast.success(`Bridge initiated! Transfer ID: ${id}`);
      await refetchBalances();
    } catch (err: any) {
      console.error("Bridge error:", err);
      toast.error(err.message || "Transfer failed");
    } finally {
      setIsTransferring(false);
    }
  };

  const isLoading = isTransferring;

  return (
    <div className="bg-[#FDFBF7] border border-[#D0C8B8] rounded-md p-4">
      <p className="text-sm text-graphite font-medium mb-2">Bridge USDC from another chain to Arc</p>
      <div className="flex flex-wrap gap-2 items-end">
        <select
          value={sourceChainKey}
          onChange={(e) => setSourceChainKey(e.target.value as keyof typeof chainConfig)}
          className="flex-1 min-w-[120px] bg-[#FDFBF7] border border-[#D0C8B8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-foil/50"
        >
          {CHAIN_KEYS.filter(key => key !== "arc").map((key) => (
            <option key={key} value={key}>
              {chainConfig[key].label}
            </option>
          ))}
        </select>
        <span className="text-graphite text-sm">→</span>
        <span className="text-sm font-mono font-bold text-ledger-green">Arc</span>
        <div className="flex-1 min-w-[100px]">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#FDFBF7] border border-[#D0C8B8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-foil/50"
          />
          <div className="flex gap-1 mt-1">
            {["0.1", "0.5", "1", "5", "10"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className="text-xs bg-[#2A2822] hover:bg-[#3A3730] text-paper px-2 py-0.5 rounded transition"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleTransfer}
          disabled={isLoading || !address}
          className={`btn-primary text-sm py-2 px-4 ${isLoading || !address ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isLoading ? "Processing…" : "Bridge"}
        </button>
      </div>
      {transferId && (
        <p className="text-xs text-gold-foil mt-2">Transfer ID: {transferId}</p>
      )}
      <p className="text-xs text-graphite mt-2">
        This will burn the entered amount from your Gateway balance on the selected chain, then mint it on Arc using Circle's Forwarding Service.
      </p>
    </div>
  );
}
