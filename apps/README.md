# Examples

## Full demo (same-origin funnel)

```bash
pnpm install
pnpm dev
```

| Surface   | URL                                  |
| --------- | ------------------------------------ |
| Marketing | http://localhost:5173                |
| App       | http://localhost:5173/app.html       |
| Dashboard | http://localhost:5173/dashboard.html |
| API       | http://localhost:8787                |

Vite proxies `/ingest`, `/stats`, `/events`, and `/stream` (SSE) to the API — so marketing, app, and dashboard share **one origin**.

### Happy path

1. Open http://localhost:5173/dashboard.html — tiles and feed are already full (seeded history)
2. Watch the feed tick via **SSE** as synthetic live traffic lands
3. Open http://localhost:5173/?utm_source=twitter&utm_medium=social&utm_campaign=launch
4. Click **Start free** → lands in the app with the same visitor id
5. **Sign in as Alex** → identify stitches the funnel
6. Your real events stream into the same dashboard instantly

The Lit dashboard (`harbor-dashboard`, `stat-tile`, `rank-list`, `event-stream`) connects to `/stream` (SSE). It falls back to polling `/stats` + `/events` if SSE drops.

Set `HARBOR_LIVE_TRAFFIC=0` to disable the synthetic traffic generator.

## Wire your own backend

```ts
import { Hono } from 'hono'
import { registerIngest, type AnalyticsStore } from '@altitudems/analytics-server'

const store: AnalyticsStore = {
  async insert(events, meta) {
    // persist to Postgres / ClickHouse / …
  },
}

const app = new Hono()
registerIngest(app, { store, writeKey: process.env.ANALYTICS_WRITE_KEY })
```

`MemoryStore` is for demos only.
