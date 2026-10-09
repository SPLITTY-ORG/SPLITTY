---
description: A step-by-step walkthrough for creating and executing a batch payment.
icon: list-check
---

# Your First Split

Step-by-step walkthrough for creating and executing a batch payment.

## Step 1 — Connect your wallet

Connect the wallet that will fund the payment. Splitty automatically switches your wallet to Arc on login. Make sure the network badge in the top bar shows **Arc Mainnet** for production or **Arc Testnet** for testing.

## Step 2 — Choose your token

In the **01 · ASSET** step, select Arc USDC or enter a custom ERC-20 token address. Splitty reads the token symbol and decimals automatically.

## Step 3 — Choose the split mode

In the **02 · SPLIT MODE** step:

* Use **Equal** when every recipient should receive the same amount.
* Use **Custom** when recipients need different amounts.

## Step 4 — Choose your funding source

In the **03 · FUNDING** step, select one of the three USDC funding sources:

* **Native** — use USDC held directly in your connected Arc wallet.
* **Gateway Balance** — use USDC available in your Circle Gateway balance.
* **Native/Gateway** — combine both sources.

For custom ERC-20 tokens, funding always uses the connected wallet.

If your wallet balance is sufficient, the Gateway option is tucked into an **Advanced** section. It appears prominently when your wallet balance would fall short.

## Step 5 — Build the recipient list

Use **04 · IMPORT / PASTE** to add addresses:

* Paste a list of addresses (one per line).
* Import a CSV file with address and amount columns.
* Or load a saved list from **05 · SAVED LISTS**.

Inline validation marks any invalid or duplicate addresses as you go. The Review Split button shows the reason it is disabled until the list is valid.

## Step 6 — Review the batch

Click **Review Split** to open the review modal. Check the token, total amount, recipient count, and individual allocations. Expand the **Technical details** section to see the contract addresses being used.

## Step 7 — Sign once

Click **Confirm & Send**. Splitty converts the recipient list into individual token transfer calls and executes them together through **Multicall3From** as a single batch transaction. A four-step progress bar tracks each stage: BUILDING → FUNDING → CONFIRMING → BROADCASTING.

## Step 8 — Check the result

Once the transaction is confirmed, Splitty decodes the receipt and shows recipient-level outcomes. If any transfers fail, a **Retry just these** button lets you re-send to the failed addresses only — no need to rebuild the whole list.

Open **History** to see the completed split, expand the row for a per-recipient breakdown, download a CSV receipt, or run the same distribution again.
