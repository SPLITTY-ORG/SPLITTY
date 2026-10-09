---
description: Understand the transaction pipeline behind Splitty's batch payments.
icon: sitemap
---

# How Splitty Works

A split moves through a simple pipeline:

```
Connect wallet
    ↓
Choose token and split mode (Equal / Custom)
    ↓
Add or load recipients
    ↓
Choose funding source (Native / Gateway Balance / Native/Gateway)
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

Splitty accepts manually entered recipients, pasted address lists, CSV imports, and saved recipient lists. In Custom mode each recipient carries their own amount. In Equal mode the total is divided evenly across all valid recipients.

Inline validation catches invalid addresses and duplicate entries before the Review step, so problems are visible before signing.

## Funding

Splitty has three funding sources for USDC splits:

* **Native** — funds available in the connected Arc wallet.
* **Gateway Balance** — USDC available through Circle Gateway across all supported source chains.
* **Native/Gateway** — a combination of Arc wallet balance and Gateway Balance.

Custom ERC-20 token splits always use Native funding.

When Gateway Balance or Native/Gateway is selected and the Gateway balance on Arc is insufficient, Splitty automatically bridges the required amount from the best available source chain before executing the split.

## Execution

The split form builds ERC-20 transfer calls for each recipient and submits them through `Multicall3From`, which batches every recipient's transfer into one onchain submission while still executing each call independently. That per-call independence is what makes partial success possible: one recipient's transfer can fail — an invalid address, insufficient allowance, a reverting token — without blocking or reverting the transfers to everyone else. The app decodes each call's individual outcome from the transaction receipt.

## After execution

Successful transfers are reported immediately. Failed recipients are listed separately and can be retried individually without rebuilding the full distribution. Every split, deposit, and bridge is recorded in the History tab with per-recipient details and a downloadable CSV receipt.
