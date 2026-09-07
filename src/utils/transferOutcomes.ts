import { decodeEventLog, getAddress, type Address } from "viem";

export const TRANSFER_EVENT_ABI = {
  anonymous: false,
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: false, name: "value", type: "uint256" },
  ],
  name: "Transfer",
  type: "event",
} as const;

export type TransferLog = {
  address: string;
  data: `0x${string}`;
  topics: readonly `0x${string}`[] | [];
};

export type Transfer = { to: string; value: bigint };

export type RecipientOutcome = {
  address: string;
  amount: string;
  success: boolean;
};

/** Pull the token's Transfer events out of a receipt's logs. */
export function decodeTransfers(
  logs: readonly TransferLog[],
  tokenAddress: Address
): Transfer[] {
  const token = tokenAddress.toLowerCase();
  return logs
    .filter((log) => log.address.toLowerCase() === token)
    .map((log) => {
      try {
        const decoded = decodeEventLog({
          abi: [TRANSFER_EVENT_ABI],
          data: log.data,
          topics: log.topics as never,
        });
        return {
          to: decoded.args.to as string,
          value: decoded.args.value as bigint,
        };
      } catch {
        return null;
      }
    })
    .filter((t): t is Transfer => t !== null);
}

/**
 * Work out which recipients actually got paid.
 *
 * Every call in the batch is submitted with `allowFailure: true`, so an
 * individual transfer can revert while the transaction as a whole still
 * succeeds. A recipient was paid only if the receipt carries a matching
 * Transfer event; a reverted transfer emits nothing.
 *
 * Events are consumed as they are matched, so the same address listed twice
 * needs two events to count as two successes rather than one event
 * satisfying both.
 *
 * Matching is by address only, deliberately. A fee-on-transfer token
 * delivers less than the amount requested, and reporting that as a failed
 * payment would invite the user to send it a second time.
 */
export function resolveOutcomes(
  transfers: readonly Transfer[],
  recipients: readonly { address: string; amount: string }[]
): RecipientOutcome[] {
  const pool = transfers.map((t) => ({ to: safeAddress(t.to), used: false }));

  return recipients.map((r) => {
    const to = safeAddress(r.address);
    const hit = to === null ? undefined : pool.find((p) => !p.used && p.to === to);
    if (hit) hit.used = true;
    return { address: r.address, amount: r.amount, success: Boolean(hit) };
  });
}

function safeAddress(value: string): string | null {
  try {
    return getAddress(value.trim());
  } catch {
    return null;
  }
}
