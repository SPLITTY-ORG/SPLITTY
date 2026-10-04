---
description: Pre-deployed contract addresses Splitty calls, by network.
icon: file-contract
---

# Contract Addresses

Splitty uses pre-deployed Arc contracts for Gateway funding and batch execution. It also uses the SplittyBatcher contract for custom-token batch transfers. The addresses below are separated by network so integrations can use the correct deployment.

## Arc Mainnet

| Contract | Address | Purpose |
| --- | --- | --- |
| USDC (ERC-20 interface) | `0x3600000000000000000000000000000000000000` | Native USDC with an ERC-20 interface. 6 decimals. |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | Arc's predeployed forwarder. Batches USDC transfers while preserving `msg.sender` in each subcall. Used for USDC splits. |
| SplittyBatcher | `0x941E49c0cF2F76Cc4f79D9fd1E4A892893e90032` | Splitty's contract for custom ERC-20 batch transfers via `approve` + `transferFrom`. |
| GatewayWallet (Arc) | `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE` | Circle Gateway deposit contract. Used when funding Gateway from an Arc wallet directly. |
| GatewayMinter (Arc) | `0x2222222d7164433c4C09B0b0D809a9b52C04C205` | Circle Gateway mint contract. Used by the SDK when Gateway credits funds to Arc. |

## Arc Testnet

| Contract | Address | Purpose |
| --- | --- | --- |
| USDC (ERC-20 interface) | `0x3600000000000000000000000000000000000000` | Native USDC with an ERC-20 interface. 6 decimals. |
| Multicall3From | `0x522fAf9A91c41c443c66765030741e4AaCe147D0` | Arc's predeployed forwarder. Batches USDC transfers while preserving `msg.sender` in each subcall. Used for USDC splits. |
| SplittyBatcher | `0x5b09dB6bC8085032aC2E63ADa99de0d4c8F414c3` | Splitty's contract for custom ERC-20 batch transfers via `approve` + `transferFrom`. |
| GatewayWallet (Arc) | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` | Circle Gateway deposit contract. Used when funding Gateway from an Arc wallet directly. |
| GatewayMinter (Arc) | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` | Circle Gateway mint contract. Used by the SDK when Gateway credits funds to Arc. |

## Other supported testnet USDC

| Network | USDC Address |
| --- | --- |
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Ethereum Sepolia | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

{% hint style="success" %}
Splitty is now deployed on Arc Mainnet. Use the Arc Mainnet addresses above for production integrations. The Testnet addresses remain available for testing.
{% endhint %}
