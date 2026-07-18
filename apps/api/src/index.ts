import { serve } from '@hono/node-server'
import { MemoryStore, registerDemoRoutes, registerIngest } from '@altitudems/analytics-server'
import { Hono } from 'hono'

const writeKey = process.env.ANALYTICS_WRITE_KEY ?? 'dev-write-key'
const port = Number(process.env.PORT ?? 8787)

const store = new MemoryStore()
const app = new Hono()

app.get('/health', (c) => c.json({ ok: true, events: store.list().length }))

registerIngest(app, {
  store,
  writeKey,
  path: '/ingest',
  // Demo is same-origin via Vite proxy; keep CORS open for direct API calls.
  corsOrigin: true,
})

registerDemoRoutes(app, {
  store,
  corsOrigin: true,
})

console.log(`
  Harbor analytics API
  --------------------
  http://localhost:${port}/ingest   POST  (writeKey=${writeKey})
  http://localhost:${port}/stats    GET   demo
  http://localhost:${port}/events   GET   demo
`)

serve({ fetch: app.fetch, port })
