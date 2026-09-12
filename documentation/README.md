---
description: The concepts that shape Splitty’s payment workflow.
icon: book
---

# What is Splitty?

Splitty is a batch USDC payment application built for Arc, Circle’s Layer-1 blockchain for programmable money. Instead of sending the same token to each wallet in a separate transaction, Splitty lets you prepare a recipient set, review the distribution, and execute it as a single batch.

Because Arc settles in under a second and uses USDC as its native gas token, a Splitty batch behaves like one coordinated payment rather than a queue of individual transfers waiting on separate confirmations.

## Core capabilities

* **Batch transfers** — Distribute USDC across many wallets in one execution instead of one transaction per recipient.
* **Equal or custom splits** — Divide an amount evenly across all recipients, or set each recipient’s amount individually.
* **Recipient management** — Add recipients manually, paste a list of addresses, import a CSV file, or reuse a saved recipient list.
* **USDC funding** — Fund a split from your Arc wallet balance, from Circle Gateway liquidity, or from a mix of both when available.
* **Gateway bridging** — Deposit USDC into a Circle Gateway balance from another chain, such as Ethereum or Base Sepolia. Then bridge it to Arc before a split, without waiting for source-chain finality to spend it elsewhere first.
* **History** — Review past splits, Gateway deposits, and bridge transfers, including their status and transaction hashes.

## How the pieces fit together

A typical Splitty flow moves through three layers:

1. **Fund** — USDC reaches your Gateway balance. Deposit it directly on a source chain, or use a prior deposit.
2. **Bridge** — Gateway USDC is bridged to Arc, becoming spendable there.
3. **Split** — The Arc balance is distributed to your recipient set in a single batch execution, using an equal or custom split.

Splitty is designed to make a multi-recipient payment feel like one coordinated action — fund once, bridge once, split once — rather than a collection of independent transfers each carrying their own delay and gas cost.
