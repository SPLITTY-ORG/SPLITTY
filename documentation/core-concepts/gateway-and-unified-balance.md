---
description: How Splitty uses Circle Gateway’s balance across supported chains.
icon: bridge
---

# Gateway & Unified Balance

Splitty uses Circle Gateway Balance as a USDC funding source for supported chains. Gateway’s underlying Unified Balance model lets USDC liquidity be accessed across supported chains and domains.

## What is Gateway Balance?

Gateway Balance is the USDC available through Circle Gateway for the connected account.

It is separate from the funds held directly in the connected wallet.

Splitty displays Gateway Balance alongside the connected wallet balance when funding a split.

## What is Unified Balance?

Unified Balance is the underlying Circle Gateway model that allows USDC liquidity to be accessed across supported chains and domains.

For Splitty, this means users can use Gateway as a flexible USDC funding source without needing to manually manage separate USDC funding flows for every supported chain.

## Gateway Balance vs Native Balance

These are two different sources of funds:

* **Native:** funds held directly by the connected wallet.
* **Gateway Balance:** USDC available through Circle Gateway.

Splitty can use either source, or both together, when funding a USDC split.

## Splitty’s Three Funding Sources

For a USDC split, Splitty provides three funding options:

* **Native:** use funds from the connected wallet.
* **Gateway Balance:** use USDC from Circle Gateway.
* **Native/Gateway:** combine funds from the connected wallet and Gateway Balance.

These are the three funding sources shown in the Split flow.

Unified Balance is the underlying Circle Gateway concept, not a separate Splitty funding option.

## Deposit and bridging

You can deposit USDC into Gateway from a supported source chain.

Splitty handles the required token approval and Gateway deposit transaction.

When Gateway USDC needs to be made available on Arc, Splitty can use Circle Gateway to move the required liquidity to the Arc domain.

The flow is:

**Supported Chain → Circle Gateway → Arc → Splitty Batch Transfer**

Splitty signs the required Gateway operation, starts the transfer, and tracks activity in transaction history.

## Why Gateway Matters for Splitty

Gateway Balance gives Splitty a flexible USDC funding path.

Users can fund a batch payment from:

* their connected wallet
* their Gateway Balance
* or both sources together

This makes it easier to distribute USDC without manually managing separate funding flows for every supported chain.

## Current Limitations

Gateway funding is currently used for USDC.

It is not used to fund custom ERC-20 token splits.
