<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project uses Vite+ (`vp`) for check, format, lint, test, and library pack.

- `vp check` — format (Oxfmt), lint (Oxlint), and type-check
- `vp fmt` — format only
- `vp test` / `vp run -r test` — Vitest
- `vp pack` / `vp run -r build` — tsdown library build

Docs: https://viteplus.dev/guide/

<!--VITE PLUS END-->

# Package: `@altitudems/analytics`

First-party browser analytics (product + marketing). Not PostHog, not OTel.

- `createAnalytics({ endpoint })` → `capture` / `page` / `identify` / `flush`
- Batches to your ingest URL as `IngestPayload` (`schemaVersion: 1`)
- First-touch UTMs, anonymous id, optional identify
