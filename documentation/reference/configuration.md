---
description: >-
  Environment variables, network settings, and contract configuration used by
  Splitty.
icon: sliders
---

# Configuration

Splitty keeps network, token, Gateway, and execution-contract settings in the frontend configuration layer.

## Configuration areas

* Arc chain settings
* Supported Gateway chains and domains
* USDC contract addresses
* Gateway wallet address
* Multicall3From address
* Runtime environment variables

## Funding sources

The split flow exposes three funding sources:

* **Native** — funds from the connected wallet.
* **Gateway Balance** — USDC available through Circle Gateway.
* **Native/Gateway** — a combination of the connected wallet balance and Gateway Balance.

Gateway Balance and Native/Gateway are currently for USDC. Custom ERC-20 token splits use Native funding.

When documenting or integrating with Splitty, use the repository's current configuration files as the source of truth for addresses and chain IDs. Avoid hard-coding values copied from an older documentation page.
