---
description: Key terms used across Splitty's product and developer documentation.
icon: book-open
---

# Glossary

**Batch transfer** — A single execution that contains multiple recipient transfer calls.

**Recipient** — A wallet address receiving tokens from a split.

**Recipient List** — A saved collection of recipients that can be loaded into a future split.

**Equal split** — A distribution where the total amount is divided evenly across recipients.

**Custom split** — A distribution where each recipient has an explicit amount.

**Gateway** — Circle's USDC funding layer used by Splitty for supported source domains.

**Gateway Balance** — USDC available through Circle Gateway that can be used as a Splitty funding source.

**Native** — Funds available directly from the connected wallet.

**Native/Gateway** — A Splitty funding source that combines the connected wallet balance and Gateway Balance.

**Unified Balance** — Circle Gateway's underlying model for making USDC liquidity available across supported chains and domains. It is not a separate Splitty funding option.

**Multicall3From** — Splitty's batch execution contract for packaging multiple transfer calls into one transaction while preserving the original sender across the batch.

**Partial result** — A batch where at least one recipient call succeeded and at least one recipient call failed.
