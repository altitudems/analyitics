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

Vite proxies `/ingest`, `/stats`, and `/events` to the API — so marketing and app share **one origin**, one anonymous id, one campaign cookie jar.

### Happy path

1. Open http://localhost:5173/?utm_source=twitter&utm_medium=social&utm_campaign=launch
2. Click **Start free** → lands in the app with the same visitor id
3. **Sign in as Alex** → identify stitches the funnel
4. Switch Releases ↔ Settings → SPA pageviews
5. Open the Lit dashboard → live tiles, rankings, and event feed
6. Watch live stats update

The dashboard is Lit web components (`harbor-dashboard`, `stat-tile`, `rank-list`, `event-stream`) polling the demo API’s `/stats` and `/events`.

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
