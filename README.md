<div align="center">

<svg width="64" height="64" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Splitty logo">
  <g transform="translate(50,50)">
    <path d="M0 0 L0 -40 A10 10 0 0 1 10 -30 L10 -10 A10 10 0 0 1 0 0 Z" fill="#f2b134"/>
    <path d="M0 0 L40 0 A10 10 0 0 1 30 10 L10 10 A10 10 0 0 1 0 0 Z" fill="#faeeda"/>
    <path d="M0 0 L0 40 A10 10 0 0 1 -10 30 L-10 10 A10 10 0 0 1 0 0 Z" fill="#f2b134"/>
    <path d="M0 0 L-40 0 A10 10 0 0 1 -30 -10 L-10 -10 A10 10 0 0 1 0 0 Z" fill="#faeeda"/>
    <circle cx="0" cy="0" r="8" fill="#15100b"/>
  </g>
</svg>

# SPLITTY

**Batch USDC payments on Arc — fund once, bridge once, split once.**

[![Live App](https://img.shields.io/badge/mainnet-splitty.live-f2b134?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUwLDUwKSI+PHBhdGggZD0iTTAgMCBMMCAtNDAgQTEwIDEwIDAgMCAxIDEwIC0zMCBMMTAgLTEwIEExMCAxMCAwIDAgMSAwIDAgWiIgZmlsbD0iI2YyYjEzNCIvPjxwYXRoIGQ9Ik0wIDAgTDQwIDAgQTEwIDEwIDAgMCAxIDMwIDEwIEwxMCAxMCBBMTAgMTAgMCAwIDEgMCAwIFoiIGZpbGw9IiNmYWVlZGEiLz48cGF0aCBkPSJNMCAwIEwwIDQwIEExMCAxMCAwIDAgMSAtMTAgMzAgTC0xMCAxMCBBMTAgMTAgMCAwIDEgMCAwIFoiIGZpbGw9IiNmMmIxMzQiLz48cGF0aCBkPSJNMCAwIEwtNDAgMCBBMTAgMTAgMCAwIDEgLTMwIC0xMCBMLTEwIC0xMCBBMTAgMTAgMCAwIDEgMCAwIFoiIGZpbGw9IiNmYWVlZGEiLz48Y2lyY2xlIGN4PSIwIiBjeT0iMCIgcj0iOCIgZmlsbD0iIzE1MTAwYiIvPjwvZz48L3N2Zz4=)](https://splitty.live)
[![Testnet](https://img.shields.io/badge/testnet-splitty--testnet.vercel.app-8c806d?style=flat-square)](https://splitty-testnet.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-white?style=flat-square)](LICENSE)
[![Arc](https://img.shields.io/badge/built%20on-Arc-f2b134?style=flat-square)](https://arc.io)

</div>

---

## What is Splitty?

Splitty is a batch USDC payment app built on [Arc](https://arc.io) — Circle's Layer-1 blockchain where USDC is the native gas token. Instead of sending tokens one wallet at a time, Splitty lets you prepare a recipient set, review the distribution, and execute it as a single onchain batch.

Because Arc settles in under a second and uses USDC for gas, a Splitty batch behaves like one coordinated payment rather than a queue of individual transfers each waiting on separate confirmations.

---

## Features

- **Batch transfers** — Distribute USDC across many wallets in a single transaction
- **Equal or custom splits** — Divide evenly or set each recipient's amount individually
- **Partial success** — One failed recipient never blocks the rest of the batch
- **Recipient management** — Add manually, paste addresses, import CSV, or reuse saved lists
- **Run again** — Replay any past split directly from History
- **Gateway bridging** — Deposit USDC from Ethereum, Base, Avalanche, Polygon, or OP Mainnet into Circle Gateway, then bridge to Arc
- **Fast Deposit** — One-step same-signed deposit and bridge via Circle's Gateway Fast Deposit
- **Unified balance funding** — Fund splits from your Arc wallet, Circle Gateway balance, or a mix of both
- **Custom tokens** — Split any ERC-20, not just USDC
- **Transaction history** — Full log of splits, deposits, and bridges with explorer links, CSV receipts, and mainnet/testnet tagging
- **Mainnet + testnet** — Single codebase, environment-switched at build time

---

## How It Works

```
Connect wallet  →  Choose token + split mode  →  Add recipients
        ↓
Choose funding source (Arc wallet / Gateway / mixed)
        ↓
Review distribution  →  Build batch transfer calls
        ↓
Execute via Multicall3From  →  Decode per-recipient outcomes
        ↓
Save to history
```

The split form builds ERC-20 transfer calls per recipient and submits them through `Multicall3From`, Arc's predeployed forwarder. Each call executes independently — a reverting transfer for one recipient does not roll back the others.

---

## Supported Networks

### Mainnet

| Network | Chain ID | Role |
|---|---|---|
| Arc | 5042 | Batch execution + Gateway destination |
| Base | 8453 | Gateway deposit source |
| Ethereum | 1 | Gateway deposit source |
| Avalanche | 43114 | Gateway deposit source |
| Polygon PoS | 137 | Gateway deposit source |
| OP Mainnet | 10 | Gateway deposit source |

### Testnet

| Network | Chain ID | Role |
|---|---|---|
| Arc Testnet | 5042002 | Batch execution + Gateway destination |
| Base Sepolia | 84532 | Gateway deposit source |
| Ethereum Sepolia | 11155111 | Gateway deposit source |
| Avalanche Fuji | 43113 | Gateway deposit source |
| Polygon Amoy | 80002 | Gateway deposit source |
| OP Sepolia | 11155420 | Gateway deposit source |

---

## Contract Addresses

### Arc Mainnet

| Contract | Address | Purpose |
|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | Native USDC (ERC-20 interface, 6 decimals) |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | Batch forwarder — preserves `msg.sender` per subcall |
| SplittyBatcher | `0x941E49c0cF2F76Cc4f79D9fd1E4A892893e90032` | Custom ERC-20 batch transfers |
| Gateway Wallet | `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE` | Circle Gateway deposit contract |
| Gateway Minter | `0x2222222d7164433c4C09B0b0D809a9b52C04C205` | Circle Gateway mint contract |

### Arc Testnet

| Contract | Address | Purpose |
|---|---|---|
| USDC | `0x3600000000000000000000000000000000000000` | Native USDC (ERC-20 interface, 6 decimals) |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | Batch forwarder |
| SplittyBatcher | `0x5b09dB6bC8085032aC2E63ADa99de0d4c8F414c3` | Custom ERC-20 batch transfers |
| Gateway Wallet | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` | Circle Gateway deposit contract |
| Gateway Minter | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` | Circle Gateway mint contract |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v3 |
| Wallet auth | Privy (`@privy-io/react-auth`, `@privy-io/wagmi`) |
| Onchain | wagmi v3, viem v2, `@wagmi/core`, `@wagmi/connectors` |
| Circle | `@circle-fin/app-kit`, `@circle-fin/unified-balance-kit`, `@circle-fin/adapter-viem-v2` |
| Database | Supabase (transaction history) |
| Batch execution | Multicall3From (Arc predeployed), SplittyBatcher (custom ERC-20) |
| Testing | Vitest |
| Linting | Oxlint |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager and runtime)
- A [Privy](https://privy.io) app ID
- A [Supabase](https://supabase.com) project with a `transaction_history` table
- An Arc RPC URL (testnet: `https://rpc.testnet.arc.network` / mainnet: `https://rpc.mainnet.arc.io`)

### Install

```bash
bun install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `VITE_PRIVY_APP_ID` | Yes | Your Privy app ID |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_ARC_RPC_URL` | Yes | Arc RPC endpoint |
| `VITE_APP_ENV` | Yes | `testnet` or `mainnet` — switches all contract addresses, RPCs, and Gateway config |

### Run

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Preview production build

```bash
bun run preview
```

### Test

```bash
bun run test
```

---

## Deployments

| Environment | URL | `VITE_APP_ENV` |
|---|---|---|
| Mainnet | [splitty.live](https://splitty.live) | `mainnet` |
| Testnet | [splitty-testnet.vercel.app](https://splitty-testnet.vercel.app) | `testnet` |

The network is chosen at build time. A `mainnet` build uses mainnet contract addresses, RPCs, and the mainnet Circle Gateway API. A `testnet` build uses testnet equivalents. Both deployments share the same codebase.

---

## Supabase Schema

Splitty requires a `transaction_history` table in your Supabase project:

```sql
create table transaction_history (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  event_type text not null,  -- 'batch_split' | 'gateway_deposit' | 'gateway_fast_deposit' | 'bridge_to_arc'
  data jsonb not null default '{}',  -- includes network, amounts, chain labels, transferId, recipients
  tx_hash text not null default '',
  created_at timestamptz not null default now()
);

-- Index for per-wallet queries
create index on transaction_history (wallet_address, created_at desc);

-- Realtime (optional — enables live history updates)
alter publication supabase_realtime add table transaction_history;
```

The `data` column stores all event-specific fields as JSON, including `network: "mainnet" | "testnet"` so history correctly tags and filters records across environments.

---

## Project Structure

```
src/
  chains/          Arc mainnet and testnet chain definitions
  components/      All UI components (SplitForm, GatewayDashboard, History, Landing, …)
  config/          Gateway chain config for testnet, mainnet, and the active switcher
  hooks/           wagmi/custom hooks (balances, chain switching, Gateway)
  lib/             Supabase client, toast helpers, time formatters
  utils/           Split math, multicall encoding, Gateway bridging, transfer outcomes
  main.tsx         App entry point with Privy + wagmi + Supabase providers
documentation/     Full GitBook docs source
```

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b your-feature`
3. Commit your changes
4. Push and open a PR against `main`

`main` is protected — all changes go through a pull request.

---

<div align="center">
  <sub>Built on <a href="https://arc.io">Arc</a> · Powered by <a href="https://circle.com">Circle</a> USDC · <a href="https://splitty.live">splitty.live</a></sub>
</div>
