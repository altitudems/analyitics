<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project uses Vite+ (`vp`) for check, format, lint, test, and library pack.

- `vp check` — format (Oxfmt), lint (Oxlint), and type-check
- `vp fmt` — format only
- `vp test` / `vp run … test` — Vitest
- `vp pack` / `vp run … build` — library build

Docs: https://viteplus.dev/guide/

<!--VITE PLUS END-->

# Layout

```
packages/analytics         # browser SDK
packages/analytics-server  # AnalyticsStore + ingest (Hono helper)
apps/api                   # example Hono + MemoryStore
apps/marketing             # Harbor marketing site
apps/app                   # fake product shell
```

## Demo

```bash
pnpm install
pnpm dev
```

See `apps/README.md`.
