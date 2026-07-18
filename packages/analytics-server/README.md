# @altitudems/analytics-server

Ingest helpers for first-party analytics. **You bring the database.**

```ts
import { Hono } from 'hono'
import {
  MemoryStore, // demos only
  registerIngest,
  type AnalyticsStore,
} from '@altitudems/analytics-server'

const store: AnalyticsStore = {
  async insert(events, meta) {
    // INSERT INTO analytics_events …
  },
}

const app = new Hono()
registerIngest(app, {
  store,
  writeKey: process.env.ANALYTICS_WRITE_KEY,
  maxBatchSize: 100,
})
```

## Also included

- `createIngestHandler` — framework-agnostic `Request` → `Response`
- `parseIngestPayload` — deep validation (re-exported)
- `MemoryStore` + `registerDemoRoutes` — local `/stats` + `/events` for demos

Suggested columns: `id, type, event, timestamp, anonymous_id, user_id, session_id, properties jsonb, context jsonb, received_at`.
