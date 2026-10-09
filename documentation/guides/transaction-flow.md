---
icon: arrows-left-right
---

# Transaction Flow

A Splitty payment moves through four states shown in the progress bar:

```
BUILDING
   ↓
FUNDING / APPROVAL (if required)
   ↓
CONFIRMING
   ↓
BROADCASTING
   ↓
Confirmed
```

A transaction can also end with a failed or partial result.

## States explained

**BUILDING** — Splitty is assembling the batch call data and checking balances.

**FUNDING / APPROVAL** — If Gateway bridging is needed (Native/Gateway mode) or a token approval is required, this step handles it. The bridge safety message stays visible until the bridge transaction has sufficient finality before the split is submitted.

**CONFIRMING** — The batch transaction has been submitted and is waiting to be included in a block.

**BROADCASTING** — The transaction is confirmed on-chain. Splitty is decoding the receipt.

## Partial execution

After the batch transaction is confirmed, Splitty decodes individual call outcomes from the receipt. Explicitly failed calls are mapped back to their recipients and shown separately.

## Retry

If some recipients fail, a **Retry just these** button appears. Clicking it pre-fills the split form with only the failed recipients, preserving their amounts. This makes it possible to recover from a bad address, insufficient token approval, or any other recipient-specific failure without rebuilding the whole distribution.

The original split and the retry each appear as separate rows in History, so the full record is preserved.

## History

Every completed split, deposit, and bridge is recorded in the History tab. Split rows are expandable — click any row to see the per-recipient outcome, download a CSV receipt, or run the same distribution again.
