# Button Responsiveness & Notification Audit

## Summary
9 issues found across SplitForm, GatewayDashboard, and the toast system.

---

## Critical / High

### 1. Review Split button has no instant feedback
**File:** `SplitForm.tsx` — `onReview()`
**Problem:** When clicked, the form runs validation (sync), then `setShowReview(true)`. No loading state, no disabled state during the ~0ms gap. On slow devices the user can double-click and open two review modals.
**Fix:** Disable the button immediately on first click using a `isReviewing` guard.

### 2. `writeContract` is fire-and-forget — button stays active after wallet prompt dismissed
**File:** `SplitForm.tsx` — `executeSplit()`
**Problem:** `writeContract` (not `writeContractAsync`) is called, so the `await` returns immediately after the wallet popup appears — not after the user confirms. Status goes to `"confirming"` but `isSubmitting` is never set to `true` before the await, so a race between the status flip and `isLoading` can briefly leave the button active.
**Fix:** Set `setIsSubmitting(true)` BEFORE calling `writeContract`, not after.

### 3. Toast durations — success toasts disappear too fast, errors too slow
**File:** `src/lib/toast.tsx`
**Problem:** `react-hot-toast` default duration is 2000ms for success and 4000ms for error. For a financial app:
- Success ("Deposit submitted!") vanishes before the user finishes reading it
- Error toasts with long messages (insufficient balance) need more time
**Fix:** Set explicit durations — success: 4000ms, error: 6000ms, info: 5000ms.

### 4. Loading toast never dismissed on bridge failure
**File:** `SplitForm.tsx` — `bridgeAndSplit()`
**Problem:** `toastLoading()` returns an ID but if `bridgeToArc()` throws, the loading toast stays on screen permanently (no `toast.dismiss()` in the catch block).
**Fix:** Store the toast ID and dismiss in `finally`.

---

## Medium

### 5. No debounce on "Review Split" button — rapid clicks submit the review multiple times
**File:** `SplitForm.tsx`
**Problem:** The Review button calls `onReview` synchronously. Rapid double-click opens two review modals stacked.
**Fix:** Set a `isReviewing` ref, clear after `setShowReview(true)`. (Covered by fix #1.)

### 6. Standard deposit button not disabled during approval phase
**File:** `GatewayDashboard.tsx`
**Problem:** `isDepositing` is set to `true` at the start so the button is disabled — good. But `depositSwitch.isMismatched` check happens before `isDepositing` is set, so a very fast second click between the validation check and `setIsDepositing(true)` can slip through.
**Fix:** Move `setIsDepositing(true)` to BEFORE the balance check (after the address guard).

### 7. Bridge button has no success notification after poll completes
**File:** `GatewayDashboard.tsx` — `handleBridge()`
**Problem:** On `pollTransferStatus` finalized/confirmed, `toastSuccess("Bridge completed!")` fires. But if the poll times out (`toastInfo` fallback), the loading toast from `bridgeToArc()` is never dismissed.
**Fix:** Wrap the bridge loading toast ID and dismiss in `finally`.

### 8. `toastInfo` has no duration set — uses toast default (same as success = 2s)
**File:** `src/lib/toast.tsx`
**Problem:** Info toasts (e.g. "Fast deposit still pending — do not submit another") use the default 2s duration and vanish before the user reads the warning.
**Fix:** Set info duration to 6000ms.

---

## Low

### 9. No visual feedback on copy-address button success
**File:** `App.tsx` — copy address button
**Problem:** Clicking copies the address silently. The user has no confirmation it worked.
**Fix:** Flip the icon to `<Check />` for 1.5s then back to `<Copy />`.

---

## Files to change
- `src/lib/toast.tsx` — durations (#3, #8)
- `src/components/SplitForm.tsx` — isSubmitting timing (#2), loading toast dismiss in bridge (#4), review guard (#1/#5)
- `src/components/GatewayDashboard.tsx` — setIsDepositing timing (#6), bridge toast dismiss (#7)
- `src/App.tsx` — copy button feedback (#9)
