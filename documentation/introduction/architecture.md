---
description: >-
  A technical overview of Splitty's frontend, batch execution, and funding
  architecture.
icon: cubes
---

# Architecture

Splitty is a client application that coordinates wallet access, recipient preparation, batch execution, Circle Gateway funding, and transaction history.

```
                    ┌─────────────────┐
                    │     Splitty     │
                    │   React / Vite  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
     Wallet/Auth         Split Engine      Circle Gateway
   Privy + Wagmi       recipients + CSV     Gateway Balance
          │                  │                  │
          │                  ▼                  │
          │             Multicall3From        │
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                           Arc
                             │
                             ▼
                      Recipient wallets

                     Supabase
                 ┌─────────┴─────────┐
                 ▼                   ▼
          Saved recipient lists  Transaction history
```

## Main application layers

**Frontend:** React components and hooks manage the split form, balances, Gateway dashboard, history, and wallet state.

**Wallet and chain layer:** Privy provides authentication/wallet access while Wagmi/Viem handle account, chain, contract reads, writes, signing, and token metadata.

**Batch execution:** Splitty constructs transfer calls and executes them through **Multicall3From**.

**Gateway:** Circle Gateway supplies Gateway Balance and a bridge path into Arc for USDC.

**Funding sources:** Splitty exposes three funding sources for the split flow: **Native**, **Gateway Balance**, and **Native/Gateway**. Native uses the connected wallet; Gateway Balance uses Circle Gateway USDC; Native/Gateway combines both.

**Persistence:** Supabase stores reusable recipient lists and transaction-history records.
