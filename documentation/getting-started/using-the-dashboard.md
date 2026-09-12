---
icon: table-columns
---

# Using the Dashboard

Splitty is organized around three main dashboard tabs: **Split**, **Fund Gateway**, and **History**. Each tab handles a different part of the batch payment workflow.

## Split

The **Split** tab is where you create and send batch payments.

From here you can:

* Choose the token you want to send, including USDC or a supported ERC-20 token.
* Choose **Equal** or **Custom** split mode.
* Add recipients manually or paste a recipient list.
* Import recipients and amounts from a CSV file.
* Load a saved recipient list.
* Review recipients and amounts before sending.
* Choose one of the three funding sources for USDC: **Native**, **Gateway Balance**, or **Native/Gateway**.
* Confirm and execute the batch transfer.

Splitty builds the individual transfer calls and executes them together through **Multicall3From**, so multiple recipients can be paid in one transaction.

## Fund Gateway

The **Fund Gateway** tab is used to manage USDC available through Circle Gateway.

From here you can:

* View your available Gateway Balance.
* Deposit USDC into Gateway when funding is needed.
* Bridge supported USDC liquidity to Arc.
* Monitor Gateway bridge status.
* Prepare Gateway Balance for a USDC split.

Gateway funding is currently specific to USDC. Custom ERC-20 tokens use Native funding.

## History

The **History** tab shows activity from previous Splitty operations.

You can use it to review:

* Batch split transactions.
* Gateway deposits.
* Bridges to Arc.
* Transaction timestamps and hashes.
* Transaction status and batch details.

Where available, transaction hashes can be opened in ArcScan for on-chain verification.

## The Typical Workflow

A normal Splitty workflow looks like this:

**Split → Choose funding source → Review and send → History**

If you choose **Gateway Balance** or **Native/Gateway** and need more Gateway liquidity, use **Fund Gateway** before completing the split. If you already have enough funds in your selected source, you can complete the payment directly from **Split**.
