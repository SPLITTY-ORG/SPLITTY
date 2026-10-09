---
description: Cross-chain USDC batch payments on Arc.
icon: book
---

# What is Splitty?

Splitty is a cross-chain USDC batch payment app built on Arc, Circle's blockchain where USDC is the native gas token. Instead of sending USDC to each wallet in a separate transaction, Splitty lets you prepare a recipient list, review the distribution, and execute it as a single batch — paying dozens of wallets at once.

Because Arc settles in under a second and uses USDC as its native gas token, a Splitty batch behaves like one coordinated payment rather than a queue of individual transfers waiting on separate confirmations.

## Core capabilities

* **Batch transfers** — Distribute USDC or any ERC-20 across many wallets in one execution.
* **Equal or custom splits** — Divide an amount evenly across all recipients, or set each amount individually.
* **Recipient management** — Add recipients manually, paste a list, import a CSV, or reuse a saved recipient list.
* **Three funding sources** — Fund a split from your Arc wallet balance (Native), from Circle Gateway (Gateway Balance), or from both together (Native/Gateway).
* **Cross-chain deposits** — Deposit USDC into Circle Gateway from Ethereum, Base, Avalanche, OP Mainnet, or Polygon PoS and bridge it to Arc before splitting.
* **History** — Review past splits, Gateway deposits, and bridge transfers. Expand any split row to see per-recipient outcomes and download a CSV receipt.

## How it works

1. **Connect your wallet** — sign in with a wallet or email via Privy.
2. **Add recipients** — paste addresses, import a CSV, or load a saved list.
3. **Choose your funding source** — Native wallet, Gateway Balance, or both.
4. **Send at once** — review the batch, confirm once, one on-chain call.

## Networks

Splitty runs on Arc Mainnet at [splitty.live](https://splitty.live) and on Arc Testnet for development. All Gateway deposit source chains (Ethereum, Base, Avalanche, OP Mainnet, Polygon PoS) are supported on both environments.
