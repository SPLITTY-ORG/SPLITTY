# SplitForm Bug Review

## High Priority

### 1. "Deposit to Unified Balance" button does nothing
**Location:** ~line 1795
**Bug:** The button calls `toastInfo("Deposit to Unified Balance")` — it just shows a toast. There is no navigation to the Fund Gateway tab.
**Fix:** Navigate the user to the gateway tab, or emit a callback.

### 2. Reset button does not clear `failedRecipients` or `pendingData`
**Location:** ~line 2150
The Reset button clears form fields and tx state, but does NOT reset `failedRecipients`, `pendingData`, or `setPendingBridge`. If a partial send occurred, the failed recipients panel stays visible after reset until the user refreshes.
**Fix:** Add `setFailedRecipients([])`, `setPendingData(null)`, `setPendingBridge(null)` to the reset handler.

### 3. `historySavedRef` not reset on Reset button
**Location:** ~line 2150
After a confirmed split, `historySavedRef.current` is `true`. If the user resets and submits again without a page reload, the second split never saves to history.
**Fix:** Add `historySavedRef.current = false` to the reset handler.

---

## Medium Priority

### 4. "EACH" column is wrong in custom mode with mixed amounts
**Location:** ~line 2031
In custom (non-equal) mode, the "EACH" value shows `totalToSend / recipientCount` — an average. This is misleading when recipients have different amounts.
**Fix:** Hide the EACH field in custom mode, or label it "AVG".

### 5. Equal-mode split amounts can drift due to floating-point rounding
**Location:** ~line 656 (equal-mode `useEffect`)
`splitEqually` returns correct strings, but the effect fires on every `recipients.map(r => r.address).join(",")` change. If an address is mid-typed, the split runs with a partial recipient count, then re-runs again — causing a visible flicker of wrong values.
**Fix:** Only run the effect when `filledIndexes.length` actually changes, not on every address keystroke.

### 6. `fetchSavedLists` called without cleanup — can update state after unmount
**Location:** ~line 421
`useEffect(() => { if (address) fetchSavedLists(); }, [address])` has no cleanup. If the component unmounts while the Supabase call is in flight, it will try to call `setSavedLists` on an unmounted component.
**Fix:** Add an `isMounted` flag or use an `AbortController` to cancel the fetch on cleanup.

---

## Low Priority

### 7. Retry-failed-recipients button does not reset `txHash`
**Location:** ~line 2124
When the user clicks "Retry just these", `txHash` is set to `null` but the status panel can still show the old explorer link briefly before re-render clears it.
**Fix:** Also call `setBridgeTxHash(null)` and `setTxError(null)` in the retry handler (already done for `txHash` and `status`, but bridge hash and error are missed).

### 8. `isSubmitDisabled` blocks the Confirm button in the review modal during `confirmed` state
**Location:** ~line 2269
After a successful split, `status === "confirmed"` sets `isSubmitDisabled = true`. If the user cancels the review modal and re-opens it (edge case), the Confirm button is permanently greyed out until they reset.
**Fix:** Exclude `status === "confirmed"` from `isSubmitDisabled` when in the review modal context, or reset status when the modal is opened.

### 9. No maximum recipient count guard
There is no limit on how many recipients can be added. A very large list (500+) will exceed the block gas limit and the transaction will silently fail. The user gets no warning before submitting.
**Fix:** Warn (or hard cap) when recipient count exceeds ~200.
