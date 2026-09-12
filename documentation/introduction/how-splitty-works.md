---
description: Understand the transaction pipeline behind Splitty's batch payments.
icon: sitemap
---

# How Splitty Works

A split moves through a simple pipeline:

```
Connect wallet
    ↓
Choose token and split mode
    ↓
Add or load recipients
    ↓
Choose funding source
    ↓
Review distribution
    ↓
Build batch transfer calls
    ↓
Execute through Multicall3From
    ↓
Read individual transfer outcomes
    ↓
Save transaction history
```

## Recipient preparation

Splitty accepts manually entered recipients, pasted addresses, CSV imports, and saved recipient lists. Each recipient can have an amount when using custom mode.

## Funding

Splitty has three funding sources:

* **Native** — funds available in the connected wallet.
* **Gateway Balance** — USDC available through Circle Gateway.
* **Native/Gateway** — a combination of the connected wallet balance and Gateway Balance.

Gateway Balance and Native/Gateway funding are available for USDC. Custom ERC-20 tokens use Native funding.

## Execution

The split form builds ERC-20 transfer calls for each recipient and submits them through `Multicall3From`, which batches every recipient's transfer into one onchain submission while still executing each call independently. That per-call independence is what makes partial success possible: one recipient's transfer can fail — an invalid address, insufficient allowance, a reverting token — without blocking or reverting the transfers to everyone else in the batch. The app then decodes each call's individual outcome from the transaction receipt, so successful and failed recipients can be identified.

## After execution

Successful transfers are reported immediately. Failed recipients remain identifiable so they can be corrected or retried, while the transaction is recorded in Splitty's history.
