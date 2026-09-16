# Custom Token Flow — Review & Improvements

## What the current flow does

1. User selects "Custom Token", pastes an ERC-20 address
2. App reads `decimals`, `symbol`, `name` via `useReadContract`
3. On submit: checks allowance → `approve` → `batchTransfer` via `CUSTOM_TOKEN_BATCHER`
4. History saved with token symbol/decimals

---

## Issues found

### 1. Token metadata fetched but never re-validated on address change
**File:** `SplitForm.tsx` ~line 1501–1510

When the user edits the address mid-session, `refetchDecimals/Symbol/Name` is called, but the stale values (`tokenSymbol`, `tokenDecimals`, `tokenName`) remain visible in the UI until the new fetch resolves. If the fetch is slow, the user can hit Review with a stale decimal count — amounts will be parsed with the wrong precision.

**Fix:** Reset `tokenSymbol`, `tokenDecimals`, `tokenName` to loading-state defaults immediately when `customTokenAddress` changes and the new value is a valid address:
```ts
setTokenSymbol("…");
setTokenDecimals(18); // safe default
setTokenName("…");
```

---

### 2. No loading indicator while token metadata is resolving
**File:** `SplitForm.tsx` ~line 1516–1519

The helper text `{tokenSymbol} ({tokenName}) • {tokenDecimals} decimals` appears only once `isAddress(customTokenAddress)` is true, but there's no spinner while the RPC call is in flight. Users may start entering amounts before decimals are known.

**Fix:** Add an `isLoadingToken` boolean that is `true` between "address typed" and "metadata resolved", and disable the amount inputs / Review button while it is true.

---

### 3. `approve` step uses `writeApprovalContractAsync` but `writeContractAsync` for the batch — two separate `useWriteContract` hooks
**File:** `SplitForm.tsx` ~line 1186, 1204

The approval and batch transfer use two different wagmi write hooks. This is fine functionally, but if the approval transaction fails silently (e.g. reverts), the batch still proceeds because there's no `waitForTransactionReceipt` check on the approval hash before moving on — the code only calls `waitForTransactionReceipt` for the approval but doesn't check its `status`.

**Fix:** Check `receipt.status === 'success'` on the approval receipt before proceeding:
```ts
const approvalReceipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });
if (approvalReceipt.status !== 'success') {
  throw new Error('Token approval failed');
}
```

---

### 4. Allowance check uses a stale `publicClient.readContract` call without refetching after approval
**File:** `SplitForm.tsx` ~line 1174–1198

After an approval is submitted and confirmed, the code does not re-read the allowance to confirm it landed. If the approval was for an exact amount and the RPC is slightly behind, the batchTransfer call may still revert with "insufficient allowance".

**Fix:** After waiting for the approval receipt, re-read the allowance and assert it is `>= totalAmountWei` before calling `batchTransfer`.

---

### 5. `CUSTOM_TOKEN_BATCHER` address is hardcoded without a comment on what it is
**File:** `SplitForm.tsx` line 114–115

```ts
const CUSTOM_TOKEN_BATCHER = "0x5b09dB6bC8085032aC2E63ADa99de0d4c8F414c3" as Address;
```

No comment explaining this is the deployed `SplittyBatcher` contract, which chain it is on, or where to find it. A future contributor editing this won't know if it is correct.

**Fix:** Add a comment:
```ts
// SplittyBatcher deployed on Arc Testnet (chain 5042002)
// Source: contracts/SplittyBatcher.sol
const CUSTOM_TOKEN_BATCHER = "0x5b09dB6bC8085032aC2E63ADa99de0d4c8F414c3" as Address;
```

---

### 6. Gateway funding is silently blocked for custom tokens — no UI message at the point of selection
**File:** `SplitForm.tsx` ~line 1582–1607

The funding source buttons for "GATEWAY BALANCE" and "NATIVE/GATEWAY" are disabled with `opacity-40` and a tooltip when `isCustomToken` is true, but there's no visible inline explanation. Users may be confused why those buttons don't work.

**Fix:** Show a small note below the funding source toggle when `isCustomToken` is true:
```tsx
{isCustomToken && (
  <p className="text-xs text-[#9C917E] mt-1">
    Gateway funding is only available for USDC. Custom tokens use your wallet balance only.
  </p>
)}
```

---

### 7. Custom token history record uses `fundingSource` which is always `"native"` for custom tokens — confusing in history
**File:** `SplitForm.tsx` ~line 554–559

The history insert saves `fundingSource` as whatever state value is set. For custom tokens this will always be `"native"`, but the token isn't USDC so the label is misleading in the History view.

**Fix:** In the history insert, override `fundingSource` to `"wallet"` when `isCustomToken` is true:
```ts
fundingSource: isCustomToken ? "wallet" : fundingSource,
```

---

## Priority

| # | Severity | Effort |
|---|----------|--------|
| 3 | High — approval reverts not caught | Low |
| 1 | Medium — wrong decimal parse on fast re-entry | Low |
| 4 | Medium — stale allowance check | Low |
| 2 | Low — UX polish | Low |
| 6 | Low — UX clarity | Low |
| 7 | Low — history label | Trivial |
| 5 | Low — code hygiene | Trivial |
