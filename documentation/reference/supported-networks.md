---
description: >-
  Networks Splitty connects to for wallet balances, Gateway deposits, and batch
  execution.
icon: globe
---

# Supported Networks

Networks Splitty connects to for wallet balances, Gateway deposits, and batch execution.

## Mainnet (production)

Splitty runs on Arc Mainnet as the batch execution chain, and pulls USDC from Gateway on any of these source chains.

| Network     | Chain ID | Role                                  | RPC                                   | Explorer                |
| ----------- | -------- | ------------------------------------- | ------------------------------------- | ----------------------- |
| Arc         | 5042     | Batch execution + Gateway destination | https://rpc.mainnet.arc.io            | explorer.arc.io         |
| Base        | 8453     | Gateway deposit source                | https://mainnet.base.org              | basescan.org            |
| Ethereum    | 1        | Gateway deposit source                | https://ethereum-rpc.publicnode.com   | etherscan.io            |
| Avalanche   | 43114    | Gateway deposit source                | https://api.avax.network/ext/bc/C/rpc | snowscan.xyz            |
| Polygon PoS | 137      | Gateway deposit source                | https://polygon-rpc.com               | polygonscan.com         |
| OP Mainnet  | 10       | Gateway deposit source                | https://mainnet.optimism.io           | optimistic.etherscan.io |

## Testnet (development)

Splitty runs on Arc Testnet for development and testing, with matching testnet sources for Gateway deposits.

| Network          | Chain ID | Role                                  | RPC                                         | Explorer                      |
| ---------------- | -------- | ------------------------------------- | ------------------------------------------- | ----------------------------- |
| Arc Testnet      | 5042002  | Batch execution + Gateway destination | https://rpc.testnet.arc.network             | testnet.arcscan.app           |
| Base Sepolia     | 84532    | Gateway deposit source                | https://sepolia.base.org                    | sepolia.basescan.org          |
| Ethereum Sepolia | 11155111 | Gateway deposit source                | https://ethereum-sepolia-rpc.publicnode.com | sepolia.etherscan.io          |
| Avalanche Fuji   | 43113    | Gateway deposit source                | https://api.avax-test.network/ext/bc/C/rpc  | testnet.snowscan.xyz          |
| Polygon Amoy     | 80002    | Gateway deposit source                | https://rpc-amoy.polygon.technology         | amoy.polygonscan.com          |
| OP Sepolia       | 11155420 | Gateway deposit source                | https://sepolia.optimism.io                 | sepolia-optimism.etherscan.io |

## Gateway Domain IDs

Circle Gateway identifies each network by a domain ID, used when checking or moving Gateway balances. Domain IDs are the same on mainnet and testnet.

| Network     | Domain ID |
| ----------- | --------- |
| Ethereum    | 0         |
| Avalanche   | 1         |
| OP Mainnet  | 2         |
| Arbitrum    | 3         |
| Base        | 6         |
| Polygon PoS | 7         |
| Arc         | 26        |

## Environments

Splitty runs as two deployments against the same codebase:

* **Mainnet** — splitty.live
* **Testnet** — splitty-testnet.vercel.app

The network is chosen at build time via the `VITE_APP_ENV` environment variable (`mainnet` or `testnet`). Each deployment points at its own set of contract addresses, RPCs, and Gateway domains.
