# Arc Splitter

Batch USDC payments on Arc Testnet. Paste a list of addresses and amounts and
pay everyone in a single transaction, funded from your Arc wallet, from Circle
Gateway balances on other chains, or from both.

## Running it

The app lives in `arc-splitter/`.

```
cd arc-splitter
npm install
cp .env.example .env    # then fill in the values
npm run dev
```

| Command | |
|---|---|
| `npm run dev` | local dev server |
| `npm run test` | vitest |
| `npm run lint` | oxlint |
| `npm run build` | production build |

## Layout

| | |
|---|---|
| `arc-splitter/` | the application |
| `supabase/migrations/` | database schema |
| `.github/workflows/` | CI: lint, tests and build on every PR |

## Contributing

`main` is protected — no direct pushes and no force pushes. Open a pull
request; CI has to pass before it merges.
