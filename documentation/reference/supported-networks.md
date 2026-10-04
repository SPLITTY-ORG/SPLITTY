---
description: >-
  Networks Splitty connects to for wallet balances, Gateway deposits, and batch
  execution.
icon: globe
---

# Supported Networks

Splitty supports Arc Mainnet and Arc Testnet for batch execution, with Base Sepolia and Ethereum Sepolia available as Gateway deposit sources.

## Arc Mainnet

| Network     | Chain ID | Role                                  | RPC                       | Explorer                           |
| ----------- | -------- | ------------------------------------- | ------------------------- | ---------------------------------- |
| Arc Mainnet | `5042`   | Batch execution + Gateway destination | `https://rpc.arc.network` | [arcscan.app](https://arcscan.app) |

## Arc Testnet

| Network     | Chain ID  | Role                                  | RPC                               | Explorer                                           |
| ----------- | --------- | ------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Arc Testnet | `5042002` | Batch execution + Gateway destination | `https://rpc.testnet.arc.network` | [testnet.arcscan.app](https://testnet.arcscan.app) |

## Gateway deposit sources

| Network          | Chain ID   | Role                   | RPC                        | Explorer                                             |
| ---------------- | ---------- | ---------------------- | -------------------------- | ---------------------------------------------------- |
| Base Sepolia     | `84532`    | Gateway deposit source | `https://sepolia.base.org` | [sepolia.basescan.org](https://sepolia.basescan.org) |
| Ethereum Sepolia | `11155111` | Gateway deposit source | `https://rpc.sepolia.org`  | [sepolia.etherscan.io](https://sepolia.etherscan.io) |

## Gateway domain IDs

Circle Gateway identifies each network by a domain ID, used when checking or moving Gateway balances:

| Network          | Domain ID |
| ---------------- | --------- |
| Ethereum Sepolia | `0`       |
| Base Sepolia     | `6`       |
| Arc Testnet      | `26`      |

{% hint style="info" %}
Arc uses native USDC as its gas token. Use Arc Testnet for testing and Arc Mainnet for production payments.
{% endhint %}
