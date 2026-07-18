import { serve } from '@hono/node-server'
import { MemoryStore, registerDemoRoutes, registerIngest } from '@altitudems/analytics-server'
import { Hono } from 'hono'

const writeKey = process.env.ANALYTICS_WRITE_KEY ?? 'dev-write-key'
const port = Number(process.env.PORT ?? 8787)
const corsOrigin = true

const store = new MemoryStore()
const app = new Hono()

app.get('/health', (c) => c.json({ ok: true }))

registerIngest(app, {
  store,
  writeKey,
  path: '/ingest',
  corsOrigin,
})

registerDemoRoutes(app, {
  store,
  corsOrigin,
})

console.log(`analytics example API on http://localhost:${port}`)
console.log(`  POST /ingest   writeKey=${writeKey}`)
console.log('  GET  /events   (demo)')
console.log('  GET  /stats    (demo)')

serve({ fetch: app.fetch, port })
