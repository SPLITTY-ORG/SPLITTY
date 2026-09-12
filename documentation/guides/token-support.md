---
description: >-
  How to split USDC or a custom ERC-20 token, and which funding sources apply to
  each.
icon: coins
---

# Token Support

Splitty defaults to USDC but also supports splitting any custom ERC-20 token, with one important restriction on funding.

### USDC (default)

USDC is preselected in the split form and uses the address configured for the active network. All three funding sources — Native, Gateway Balance, and Native/Gateway — are available for USDC splits.

### Custom ERC-20 tokens

To split a different token, enter its contract address manually in the split form. Splitty reads the token's symbol and decimals directly from the contract so amounts display and parse correctly.

{% hint style="warning" %}
Custom ERC-20 tokens can only be funded from **Native** — the connected wallet's balance. Gateway Balance and the Native/Gateway hybrid option are disabled for any token other than USDC, since Circle Gateway only tracks USDC liquidity.
{% endhint %}

### Funding source availability, by token

| Funding source  | USDC | Custom ERC-20 |
| --------------- | ---- | ------------- |
| Native          | ✅    | ✅             |
| Gateway Balance | ✅    | ❌             |
| Native/Gateway  | ✅    | ❌             |

If you select a custom token while Gateway Balance or Native/Gateway is active, Splitty switches funding back to Native automatically.
