---
description: Standard and fast deposit mechanics for Circle Gateway operations.
icon: plug
---

# Gateway Integration

## Gateway deposits

Splitty supports standard and fast USDC deposits into Gateway Balance.

Standard deposits wait for source-chain finality. This can take 15 minutes or longer.

Fast deposits credit the destination in seconds. Source settlement continues in the background.

## Fast deposits

Fast deposits use CCTP Fast Transfer. They are available only on supported routes.

Splitty requests a fast deposit explicitly. It never falls back to a standard deposit.

### Supported routes

| Role        | Mainnet                                                                         | Testnet                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Source      | Arbitrum, Codex, Ethereum, Ink, Linea, OP Mainnet, Plume, Unichain, World Chain | Arbitrum Sepolia, Codex Testnet, Ethereum Sepolia, Ink Testnet, Linea Sepolia, OP Sepolia, Plume Testnet, Unichain Sepolia, World Chain Sepolia |
| Destination | Avalanche, Polygon PoS                                                          | Avalanche Fuji, Polygon PoS Amoy, Arc Testnet                                                                                                   |

Fast-finality chains cannot be fast-deposit sources. This includes Avalanche and Polygon PoS.

### Fees and approval

A fast deposit has two costs:

* **Gas fee:** Paid in the source chain's native token.
* **Forwarder fee:** Paid in USDC, in addition to the deposit amount.

Your wallet must hold the deposit amount plus the forwarder fee.

Splitty obtains a fee quote before submitting the deposit. The quote locks the forwarder fee.

Fast deposits require USDC approval for Circle's `TokenMessengerWithFees` contract. Splitty submits approval when the remaining allowance is insufficient.

Pre-approving USDC can remove approval wait time from later deposits. Each deposit consumes part of the allowance.

### Deposit result

Circle's relayer completes the destination deposit in the background. Splitty records the source and relay activity in transaction history.

| Status    | Meaning                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `DONE`    | The relayer confirmed the destination deposit.                          |
| `PENDING` | The source transaction or relay is still processing.                    |
| `FAILED`  | The source burn completed, but destination delivery failed permanently. |

`PENDING` does not confirm the source transaction succeeded. Check its transaction receipt before retrying.

Do not submit another deposit while the source transaction remains pending.

## Bridge flow

When moving Gateway USDC to Arc, Splitty signs the Gateway operation and starts the transfer.

Splitty stores the transfer ID and tracks it until finalized, confirmed, or pending.
