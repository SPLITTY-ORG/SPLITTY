# Working in this repo

The application lives in `arc-splitter/`. It is a Vite + React app and it is
self-contained: run every command from that directory, not the repo root.

```
cd arc-splitter
npm install
npm run dev      # local dev server
npm run test     # vitest
npm run lint     # oxlint
npm run build    # production build
```

Vercel builds from `arc-splitter/` as its root directory, so the deployed site
is that folder and nothing else.

`supabase/migrations/` holds the database schema. `.github/workflows/ci.yml`
runs lint, tests and the build on every pull request.

`main` is protected: no direct pushes, no force pushes. Open a pull request.

Environment variables are documented in `arc-splitter/.env.example`. Copy it to
`arc-splitter/.env` and fill in real values; never commit the filled-in file.
