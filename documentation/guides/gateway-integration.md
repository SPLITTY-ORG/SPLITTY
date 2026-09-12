---
description: Deposit and bridge mechanics for Circle Gateway operations.
icon: plug
---

# Gateway Integration

## Deposit flow

A Gateway deposit consists of the required USDC approval followed by a deposit call to the configured Gateway wallet contract. The resulting activity is recorded in transaction history.

## Bridge flow

When moving Gateway USDC to Arc, Splitty signs the Gateway operation, starts the transfer, stores its transfer ID, and polls the transfer status until it is finalized, confirmed, or still pending.
