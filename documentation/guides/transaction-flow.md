---
icon: arrows-left-right
---

# Transaction Flow

A Splitty payment moves through several frontend states before the final result is shown.

```
Building
   ↓
Funding / approval if required
   ↓
Confirming
   ↓
Broadcasting
   ↓
Confirmed
```

A transaction can also end with a failed or partial result.

## Partial execution

After the batch transaction is submitted, Splitty decodes individual call outcomes. Explicitly failed calls are mapped back to their recipients.

## Retry

The split form keeps failed recipients available for correction and retry. This makes it possible to recover from a bad address, insufficient token balance, or another recipient-specific failure without rebuilding the whole distribution.
