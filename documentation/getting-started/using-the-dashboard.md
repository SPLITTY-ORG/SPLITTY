---
icon: table-columns
---

# Using the Dashboard

Splitty is organized around three tabs: **Split**, **Fund Gateway**, and **History**. Each tab handles a different part of the batch payment workflow.

## Split

The **Split** tab is where you create and send batch payments. It walks you through six labeled steps:

* **01 · ASSET** — choose USDC or a custom ERC-20 token.
* **02 · SPLIT MODE** — choose Equal (same amount for everyone) or Custom (individual amounts).
* **03 · FUNDING** — choose Native, Gateway Balance, or Native/Gateway. Gateway Balance is shown in an Advanced section when your wallet balance is sufficient.
* **04 · IMPORT / PASTE** — import recipients from a CSV file or paste a list of addresses.
* **05 · SAVED LISTS** — load or save a named recipient list.
* **06 · RECIPIENTS** — review and edit the recipient list directly.

Validation errors appear inline next to each recipient row. Duplicate addresses are flagged. The disabled Review button shows the reason it is blocked.

When you submit, a four-step progress bar tracks the transaction: **BUILDING → FUNDING → CONFIRMING → BROADCASTING**.

The sticky totals row at the bottom of the screen shows the running total, recipient count, and per-recipient amount while you build the list.

## Fund Gateway

The **Fund Gateway** tab is used to manage USDC available through Circle Gateway. A three-step header shows the flow: **01 Deposit → 02 Balance appears → 03 Split uses it**.

From here you can:

* View your available Gateway Balance across supported source chains.
* Deposit USDC into Gateway from Base, Ethereum, Avalanche, OP Mainnet, or Polygon PoS.
* Monitor deposit status with a persistent pending card showing the transaction link and finality progress.
* Bridge USDC to Arc manually using the **Advanced** section (the Split tab handles this automatically when needed).

The **What is the Gateway?** explainer can be dismissed and will stay hidden on return visits.

Gateway funding is available for USDC splits. Custom ERC-20 tokens use Native funding only.

## History

The **History** tab shows all previous Splitty activity for the connected wallet.

Use the filter chips to view: **All**, **Splits**, **Deposits**, or **Bridges**.

Split rows are expandable — click any split to see:

* Each recipient, their amount, and whether their transfer succeeded or failed.
* A **Download CSV receipt** button.
* A **Run again** button that pre-fills the Split form with that recipient list.

Transaction hashes link to the correct block explorer for each chain — Arc explorer for splits and bridges, and the source chain's explorer for deposits.

## The Typical Workflow

**Split → Choose funding source → Review and send → History**

If you choose **Gateway Balance** or **Native/Gateway** and need more liquidity, use **Fund Gateway** first. If your wallet has enough, complete the payment directly from **Split**.
