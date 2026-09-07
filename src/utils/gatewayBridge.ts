import { type Address, parseUnits, pad, zeroAddress, type Hex } from "viem";
import { GATEWAY_WALLET_ADDRESS, GATEWAY_MINTER_ADDRESS, GATEWAY_API_BASE, chainConfig } from "../config/gateway";

function randomBytes32(): Hex {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return `0x${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

function stringifyWithBigInts(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

export async function bridgeToArc(
  address: Address,
  signTypedDataAsync: (typedData: any) => Promise<string>,
  sourceChainKey: keyof typeof chainConfig,
  amount: number,
  onProgress?: (msg: string) => void
): Promise<{ transferId: string; success: boolean }> {
  const sourceConfig = chainConfig[sourceChainKey];
  const destConfig = chainConfig.arc;

  const value = parseUnits(amount.toString(), 6);
  const maxBlockHeight = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  const salt = randomBytes32();

  const spec = {
    version: 1,
    sourceDomain: sourceConfig.domainId,
    destinationDomain: destConfig.domainId,
    sourceContract: pad(GATEWAY_WALLET_ADDRESS.toLowerCase() as Hex, { size: 32 }),
    destinationContract: pad(GATEWAY_MINTER_ADDRESS.toLowerCase() as Hex, { size: 32 }),
    sourceToken: pad(sourceConfig.usdcAddress.toLowerCase() as Hex, { size: 32 }),
    destinationToken: pad(destConfig.usdcAddress.toLowerCase() as Hex, { size: 32 }),
    sourceDepositor: pad(address.toLowerCase() as Hex, { size: 32 }),
    destinationRecipient: pad(address.toLowerCase() as Hex, { size: 32 }),
    sourceSigner: pad(address.toLowerCase() as Hex, { size: 32 }),
    destinationCaller: pad(zeroAddress as Hex, { size: 32 }),
    value,
    salt,
    hookData: "0x" as Hex,
  };

  if (onProgress) onProgress("Estimating fees...");
  const estimateUrl = `${GATEWAY_API_BASE}/v1/estimate?enableForwarder=true`;
  const estimateRes = await fetch(estimateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stringifyWithBigInts([{ spec }]),
  });
  if (!estimateRes.ok) {
    const text = await estimateRes.text();
    throw new Error(`Estimate error: ${estimateRes.status} ${text}`);
  }
  const estimateJson = await estimateRes.json();
  const estimated = estimateJson.body?.[0]?.burnIntent;
  if (!estimated) throw new Error("Missing estimate");
  const maxFee = BigInt(estimated.maxFee);
  const maxBlockHeightEst = BigInt(estimated.maxBlockHeight);

  const burnIntent = { maxBlockHeight: maxBlockHeightEst, maxFee, spec };

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

  const typedData = {
    types: { EIP712Domain, TransferSpec, BurnIntent },
    domain,
    primaryType: "BurnIntent" as const,
    message: burnIntent,
  };

  if (onProgress) onProgress("Signing burn intent...");
  const signature = await signTypedDataAsync(typedData);

  if (onProgress) onProgress("Submitting transfer...");
  const transferUrl = `${GATEWAY_API_BASE}/v1/transfer?enableForwarder=true`;
  const response = await fetch(transferUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stringifyWithBigInts([
      {
        burnIntent: typedData.message,
        signature,
      },
    ]),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gateway API error: ${response.status} ${text}`);
  }
  const json = await response.json();
  const transferId = json.transferId;
  if (!transferId) throw new Error("Missing transfer ID");

  return { transferId, success: true };
}

/**
 * The result of watching a transfer.
 *
 * "pending" is not a failure. A Gateway transfer cannot be cancelled once
 * the burn intent is signed and submitted, so giving up on watching it says
 * nothing about whether the funds arrive. Reporting it as a failure invites
 * the user to bridge a second time for money that is already moving.
 */
export type TransferOutcome =
  | { status: "finalized" | "confirmed"; transactionHash?: string }
  | { status: "pending"; reason: "timeout" | "stopped" };

/** Resolves after ms, or as soon as the signal aborts. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(finish, ms);
    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    }
    signal?.addEventListener("abort", finish, { once: true });
  });
}

/**
 * Watch a transfer until it settles, the caller stops waiting, or the
 * timeout passes.
 *
 * Throws only when the transfer itself failed or expired. Running out of
 * patience returns a pending outcome instead, because the transfer is still
 * in flight and the caller should say so rather than report an error.
 */
export async function pollTransferStatus(
  transferId: string,
  timeoutMs = 120000,
  signal?: AbortSignal
): Promise<TransferOutcome> {
  const start = Date.now();
  const interval = 5000;
  while (Date.now() - start < timeoutMs) {
    if (signal?.aborted) return { status: "pending", reason: "stopped" };

    const res = await fetch(`${GATEWAY_API_BASE}/v1/transfer/${transferId}`);
    if (!res.ok) {
      await wait(interval, signal);
      continue;
    }
    const json = await res.json();
    const status = json.status;
    if (status === "finalized" || status === "confirmed") {
      return { status, transactionHash: json.transactionHash };
    }
    if (status === "failed" || status === "expired") {
      throw new Error(`Transfer ${status}: ${json.forwardingDetails?.failureReason || "unknown"}`);
    }
    await wait(interval, signal);
  }
  if (signal?.aborted) return { status: "pending", reason: "stopped" };
  return { status: "pending", reason: "timeout" };
}
