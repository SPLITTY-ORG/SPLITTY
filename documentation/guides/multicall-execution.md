---
description: How Splitty packages multiple recipient transfers into one transaction.
icon: code-branch
---

# Multicall Execution

Splitty uses **Multicall3From** to package recipient transfers into one transaction.

## Building the calls

For every recipient, Splitty creates an ERC-20 `transfer` call containing the recipient address and token amount.

## Aggregate execution

Those calls are passed to **Multicall3From** for batched execution. The mechanism preserves the original sender across the batch, so the individual token transfers can represent the original sender rather than a separate batching identity.

## Why it matters

Without batching, a distribution to many wallets would require the sender to submit separate transactions. Multicall3From lets Splitty coordinate the distribution as one batch.

## Funding

The split flow exposes three funding sources: **Native**, **Gateway Balance**, and **Native/Gateway**. Gateway Balance and Native/Gateway are used for USDC; custom ERC-20 tokens use Native funding.

## Failure handling

The application reads individual call outcomes after execution. Failed recipients are retained in the split state so the user can retry them instead of starting from scratch.
