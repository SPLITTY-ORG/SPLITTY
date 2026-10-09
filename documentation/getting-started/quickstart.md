---
description: Make your first multi-recipient payment on Arc Mainnet or Arc Testnet.
icon: bolt
---

# Quickstart

Get from connected wallet to completed batch payment in a few minutes.

## 1. Connect

Open Splitty and connect the wallet you want to use as the sender. When you connect, Splitty automatically switches to Arc. Confirm the network badge in the top bar shows **Arc Mainnet** for production payments or **Arc Testnet** for testing.

## 2. Choose a token

In the **01 · ASSET** step, select the built-in Arc USDC option or enter a compatible ERC-20 token address. Splitty reads the token metadata it needs automatically.

## 3. Add recipients

Use **04 · IMPORT / PASTE** to paste addresses directly or import a CSV file. Validation errors appear inline next to any invalid or duplicate address.

## 4. Choose the split mode

In **02 · SPLIT MODE**:

* **Equal** — divides the total amount evenly across all recipients.
* **Custom** — lets you specify the amount for each recipient individually.

## 5. Choose a funding source

In **03 · FUNDING**, select how you want to fund the split:

* **Native** — use USDC (or any ERC-20) held in your connected wallet.
* **Gateway Balance** — use USDC available in your Circle Gateway balance.
* **Native/Gateway** — combine your wallet balance and Gateway Balance.

Gateway Balance and Native/Gateway are available for USDC splits. Custom ERC-20 tokens use Native only.

## 6. Review

Click **Review Split** to open the review modal. Verify the token, total amount, recipient count, and individual allocations. Contract details are hidden by default — expand them if needed.

## 7. Execute

Click **Confirm & Send**. A four-step progress bar tracks the transaction: BUILDING → FUNDING → CONFIRMING → BROADCASTING.

## 8. Verify

After the transaction is confirmed, Splitty surfaces recipient-level outcomes. If any recipients fail, a **Retry just these** button lets you re-send to only the failed addresses without rebuilding the full list.

Check the **History** tab to see the completed split, download a CSV receipt, or run the same distribution again.

{% hint style="info" %}
For production payments, use Arc Mainnet. Start with a small Arc Testnet amount when testing a new distribution flow.
{% endhint %}
