---
description: Technical notes for developers integrating with or contributing to Splitty.
icon: right-left
---

# Batch Transfers

Splitty uses **Multicall3From** to turn multiple token transfers into a single transaction.

Instead of asking the sender to approve and submit a separate transaction for every recipient, Splitty builds one transfer call per recipient and executes them together through the configured `Multicall3From` contract.

## Why Multicall3From?

The important part is **sender preservation**.

`Multicall3From` allows the batched calls to preserve the original sender (`msg.sender`) when executing the individual transfers.

For Splitty, this means:

**User → Multicall3From → multiple token transfers → recipients**

Each recipient receives their allocation through the same batch transaction, while the transfers can still represent the original sender rather than the batching contract as the source.

## Equal mode

Enter a total amount and Splitty calculates an equal allocation across the current recipient set.

For example:

* Total: 100 USDC
* Recipients: 4
* Each recipient: 25 USDC

Splitty then creates four individual transfer calls and includes them in the batch.

## Custom mode

Custom mode allows a different amount for each recipient.

Splitty calculates the total distribution, displays the allocation for review, and then builds the corresponding transfer calls.

## Batch execution

For each recipient, Splitty creates a token transfer call containing:

* Token contract
* Recipient address
* Transfer amount

These calls are passed to `Multicall3From` and executed as a single batched transaction.

This is what allows Splitty to distribute tokens to many wallets without requiring a separate user-submitted transaction for every recipient.

## Recipient-level results

The batch contains individual calls, so Splitty can inspect the result of each call after execution.

This allows the app to identify:

* Successful transfers
* Failed transfers
* Recipients that need to be retried

A partial failure does not require rebuilding the entire distribution. Splitty can surface the unsuccessful recipients so they can be corrected and retried.
