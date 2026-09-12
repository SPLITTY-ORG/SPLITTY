---
description: >-
  Networks Splitty connects to for wallet balances, Gateway deposits, and batch
  execution.
icon: globe
---

# Supported Networks

Splitty supports three networks: one for batch execution, and two as Gateway deposit sources.

| Network          | Chain ID   | Role                                  | RPC                               | Explorer                                             |
| ---------------- | ---------- | ------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Arc Testnet      | `5042002`  | Batch execution + Gateway destination | `https://rpc.testnet.arc.network` | [testnet.arcscan.app](https://testnet.arcscan.app)   |
| Base Sepolia     | `84532`    | Gateway deposit source                | `https://sepolia.base.org`        | [sepolia.basescan.org](https://sepolia.basescan.org) |
| Ethereum Sepolia | `11155111` | Gateway deposit source                | `https://rpc.sepolia.org`         | [sepolia.etherscan.io](https://sepolia.etherscan.io) |

### Gateway domain IDs

Circle Gateway identifies each network by a domain ID, used when checking or moving Gateway balances:

| Network          | Domain ID |
| ---------------- | --------- |
| Ethereum Sepolia | `0`       |
| Base Sepolia     | `6`       |
| Arc Testnet      | `26`      |

{% hint style="info" %}
Arc's native currency is USDC itself (18 decimals at the protocol level), rather than a separate gas token like ETH.
{% endhint %}
