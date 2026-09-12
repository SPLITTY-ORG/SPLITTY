---
description: How wallets, signing, batching, and transaction results work in Splitty.
icon: file-import
---

# Bulk Recipient Import

CSV import is designed for larger recipient sets.

The expected format is:

```csv
address,amount
0xRecipientOne...,1.5
0xRecipientTwo...,2.0
```

Splitty validates recipient addresses and amounts before adding the imported rows to the split.

## Supported input

* Wallet addresses in the `address` column.
* Amounts in the `amount` column.
* Decimal amounts within the selected token's precision.

CSV recipients can be reviewed and edited before execution. You can also use the same recipient set to create a saved recipient list for future splits.

## Bulk Paste

Bulk paste is designed for quick, ad-hoc recipient entry without a file.

The expected format is one recipient per line, with the address and amount separated by a comma or tab:

```
0xRecipientOne...,1.5
0xRecipientTwo...,2.0
```

Splitty validates recipient addresses and amounts before adding the pasted rows to the split.

**Supported input**

* Wallet addresses, one per line.
* An amount following each address, separated by a comma or tab.
* Decimal amounts within the selected token's precision.

Pasted recipients can be reviewed and edited before execution. You can also use the same recipient set to create a saved recipient list for future splits.
