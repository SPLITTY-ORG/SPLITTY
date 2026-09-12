---
description: Make your first multi-recipient payment on Arc Testnet.
icon: bolt
---

# Quickstart

Get from connected wallet to completed batch payment in a few minutes.

## 1. Connect

Open Splitty and connect the wallet you want to use as the sender.

Confirm that the selected network is **Arc Testnet**.

## 2. Choose a token

Select the built-in Arc USDC option or enter a compatible ERC-20 token address.

Splitty reads the token metadata it needs, including decimals, symbol, and name.

## 3. Add recipients

Add wallet addresses manually or import a CSV file.

Each recipient must have a valid EVM address. Remove duplicates and check the list before submitting.

## 4. Choose the split mode

**Equal** divides the total amount across all recipients.

**Custom** lets you specify the amount for each recipient.

The total allocation must match the amount you intend to distribute.

## 5. Choose a funding source

Select how you want to fund the split. Splitty has three funding sources:

* **Native** — use funds available in your connected wallet.
* **Gateway Balance** — use USDC available in your Circle Gateway balance.
* **Native/Gateway** — use a combination of your connected wallet balance and Gateway Balance.

Gateway Balance and Native/Gateway funding are available for USDC. Custom ERC-20 tokens use Native funding.

## 6. Review

Before signing, verify:

* Token
* Total amount
* Recipient count
* Individual allocations
* Funding source

## 7. Execute

Submit the transaction from your wallet.

Splitty builds the individual token transfers into a batch and executes them through **Multicall3From**.

## 8. Verify

After the transaction is mined, Splitty reads the receipt and reports recipient-level outcomes where available.

If a recipient fails while other calls succeed, the result can show the successful and failed recipients separately.

> **Tip:** Start with a small testnet amount before running a large distribution.
