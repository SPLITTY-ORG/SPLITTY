---
description: A step-by-step walkthrough for creating and executing a batch payment.
icon: list-check
---

# Your First Split

Step-by-step walkthrough for creating and executing a batch payment.

This walkthrough shows the complete Splitty flow.

## Step 1 — Connect your wallet

Connect the wallet that will fund the payment. Make sure it is connected to **Arc Testnet**.

## Step 2 — Set the payment

Choose your token and enter the total amount you want to distribute. Splitty supports the built-in Arc USDC token as well as compatible ERC-20 tokens.

## Step 3 — Build the recipient list

Add addresses manually or import a CSV. For a large distribution, CSV import is usually the quickest option.

## Step 4 — Allocate

Use **Equal** when everyone should receive the same amount. Use **Custom** when recipients need different amounts.

## Step 5 — Choose your funding source

For USDC, choose one of three funding sources:

* **Native** — use USDC available in your connected Arc wallet.
* **Gateway Balance** — use USDC available in your Circle Gateway balance.
* **Native/Gateway** — combine USDC from your Arc wallet and Gateway Balance.

For custom ERC-20 tokens, funding uses the connected wallet.

## Step 6 — Review the batch

Check the number of recipients, total allocation, token, funding source, and individual amounts before signing.

## Step 7 — Sign once

Splitty converts the recipient allocations into individual token transfer calls and executes them together through **Multicall3From** as a single batch transaction.

## Step 8 — Check the result

Once the transaction is confirmed, Splitty decodes the receipt and surfaces recipient-level outcomes. For troubleshooting and a deeper look at the transaction flow, see **How Splitty Works**.
