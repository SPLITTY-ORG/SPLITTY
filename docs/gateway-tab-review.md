# Fund Gateway Tab — Bug & Recommendation Review

## Bugs

### 1. Fast deposit uses `new UnifiedBalanceKit()` without environment/adapter (HIGH)
**Line ~260:**
```ts
const result = await new UnifiedBalanceKit().deposit({
```
The execute call creates a brand-new kit instance with no `environment` or `adapter`, while the estimate was done on a properly configured kit. This will silently use wrong defaults or fail at runtime. Should reuse the same configured kit instance for both estimate and execute.

### 2. Approval receipt not checked in standard deposit (HIGH)
`handleDeposit` fires `writeContractAsync` for the `approve` call, waits 2 seconds with `setTimeout`, then refetches allowance — but never checks if the approve tx actually succeeded. A failed approval silently falls through to `deposit()` which then reverts. Should use `waitForTransactionReceipt` on the approve tx hash before proceeding.

### 3. `depositToast` declared but never dismissed in `handleDeposit` (MEDIUM)
```ts
const depositToast = toastLoading(`Depositing into Gateway...`);
const tx = await writeContractAsync({ ... });
toastSuccess("Deposit submitted!");
```
The loading toast is never dismissed — it stays on screen alongside the success toast. Should call `toast.dismiss(depositToast)` before showing the success toast.

### 4. Gateway balance display shows raw chain key not the label (MEDIUM)
```ts
<span className="receipt-address">{chainKey}</span>
```
The chain key lookup returns `"baseSepolia"`, `"ethereumSepolia"` etc. — raw camelCase keys, not human-readable labels. Should use `chainConfig[chainKey].label` instead.

### 5. Standard deposit has no `depositAmount` validation (MEDIUM)
`handleDeposit` checks `amt <= 0` but doesn't check if `depositAmount` exceeds the wallet balance. User can submit a deposit larger than their balance, which will revert after paying gas. Should add a max balance check with a clear error.

### 6. `fastDepositBalanceRaw` cast with `BigInt()` can throw (MEDIUM)
```ts
BigInt(fastDepositBalanceRaw)
```
If `fastDepositBalanceRaw` is a string like `"0x..."` or `undefined`, `BigInt()` throws. Already guarded with `!== undefined` but the raw balance from `useWalletBalance` is already a `bigint` — wrapping in `BigInt()` is redundant and risky. Should use it directly.

### 7. Bridge section always shows Gateway balance even when zero (LOW)
The balance line only renders when `sourceGatewayBalance` truthy (which it always is — it's an object). It should show a warning when the balance is 0 to stop users attempting a bridge that will fail.

### 8. Fast deposit estimate goes stale silently (LOW)
If the user changes the amount after estimating, `setFastDepositEstimate(null)` runs — but the old estimate briefly shows on screen before clearing. An explicit "Estimate outdated" label or instant clear on blur would be cleaner.

## Recommendations

### R1. Add a "MAX" button to all amount inputs
All three sections (fast deposit, standard deposit, bridge) have preset buttons but no MAX. For bridge especially this is useful since you want to move your full Gateway balance in one go.

### R2. Show a "pending" badge on Gateway balance rows
After a deposit is submitted, show a spinner/pending badge next to the balance for that chain until the next refetch confirms the balance changed.

### R3. Bridge source select should show chain icons
The `<select>` for bridge source only shows text labels. Since `<select>` doesn't support JSX children with icons, consider replacing it with a custom dropdown (same pattern as the deposit route picker) to show `ChainIcon` alongside the label.

### R4. Consolidate the adapter creation helper
`handleEstimateFastDeposit` and `handleExecuteFastDeposit` both repeat the same 12-line `createViemAdapterFromProvider` block. Extract to a `getAdapter()` helper at the top of the component.
