---
description: How Splitty uses Circle Gateway's balance across supported chains.
icon: bridge
---

# Gateway & Unified Balance

Splitty uses Circle Gateway Balance as a USDC funding source for batch payments. Gateway's underlying Unified Balance model lets USDC liquidity be accessed across supported chains without manual bridging.

## What is Gateway Balance?

Gateway Balance is the USDC available through Circle Gateway for the connected account. It is separate from the funds held directly in the connected wallet.

Splitty displays Gateway Balance alongside the connected wallet balance in the **03 · FUNDING** step and in the **Fund Gateway** tab.

## What is Unified Balance?

Unified Balance is the underlying Circle Gateway model that allows USDC liquidity to be pooled and accessed across supported chains and domains. For Splitty, this means users can fund a batch payment from Gateway without needing to manually move USDC to Arc before each split.

## Splitty's Three Funding Sources

For a USDC split, Splitty provides three funding options:

* **Native** — use USDC held directly in the connected Arc wallet.
* **Gateway Balance** — use USDC available through Circle Gateway.
* **Native/Gateway** — combine both sources. Splitty automatically bridges the required Gateway amount to Arc before submitting the batch.

Custom ERC-20 token splits always use Native funding.

When your wallet balance is sufficient, the Gateway option is shown in an **Advanced** section. It appears prominently when your wallet balance would fall short of the split total.

## Depositing into Gateway

You can deposit USDC into Gateway from any supported source chain using the **Fund Gateway** tab.

Supported source chains: **Base**, **Ethereum**, **Avalanche**, **OP Mainnet**, **Polygon PoS**.

Splitty handles the required token approval and Gateway deposit transaction. A persistent pending card tracks the deposit until finality, then your Gateway Balance updates automatically.

## How Gateway funds reach Arc

When a split uses Gateway Balance, Splitty moves the required USDC to Arc using Circle Gateway before submitting the batch:

```
Source chain USDC → Circle Gateway deposit → Arc → Splitty batch transfer
```

This bridging step happens automatically in Native/Gateway mode. You can also trigger it manually from the **Advanced** section of the Fund Gateway tab.

## Why Gateway Matters for Splitty

Gateway Balance gives Splitty a flexible, chain-agnostic USDC funding path. Users can fund a batch payment from their connected wallet, from Gateway, or from both — without manually managing separate USDC funding flows for every supported chain.

## Current Limitations

Gateway funding is available for USDC splits only. Custom ERC-20 token splits use the connected wallet balance directly.
