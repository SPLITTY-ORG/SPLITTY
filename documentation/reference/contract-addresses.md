---
description: Pre-deployed contract addresses Splitty calls, by network.
icon: file-contract
---

# Contract Addresses

Splitty doesn't deploy its own contracts. It calls pre-deployed, fixed addresses for batch execution and Gateway funding. This page lists them for reference.

### Core contracts

| Contract              | Address                                      | Purpose                                                                              |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| Gateway Wallet        | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` | Holds deposited USDC for Circle Gateway balances                                     |
| Gateway Minter        | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` | Mints USDC on the destination domain during a Gateway bridge                         |
| Forwarder (Multicall) | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | Aggregates per-recipient transfer calls into a single batch execution (`aggregate3`) |

### Circle Gateway API

| Environment | Base URL                                 |
| ----------- | ---------------------------------------- |
| Testnet     | `https://gateway-api-testnet.circle.com` |

### USDC token addresses, by network

| Network          | USDC Address                                 |
| ---------------- | -------------------------------------------- |
| Arc Testnet      | `0x3600000000000000000000000000000000000000` |
| Base Sepolia     | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Ethereum Sepolia | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

{% hint style="info" %}
These are testnet addresses. Splitty currently runs on Arc Testnet only.
{% endhint %}
