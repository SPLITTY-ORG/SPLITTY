---
icon: clock-rotate-left
---

# Transaction History

Splitty keeps a history of activity associated with the connected wallet.

The history currently covers three event types:

* **Split:** a batch token distribution.
* **Deposit:** a USDC deposit into Circle Gateway.
* **Bridge:** a Gateway-to-Arc USDC bridge.

Each record includes an event type, transaction hash, timestamp, and event-specific data. Split records can include the number of recipients, total amount, token symbol, funding source, and failed-recipient information.

Transaction hashes can be copied or opened in ArcScan.
