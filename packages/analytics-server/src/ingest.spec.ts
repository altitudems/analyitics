import { INGEST_SCHEMA_VERSION } from '@altitudems/analytics'
import { createIngestHandler } from './ingest'
import { MemoryStore } from './memory-store'

function sampleEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    type: 'page',
    event: 'pageview',
    timestamp: new Date().toISOString(),
    anonymousId: 'anon',
    userId: null,
    properties: { path: '/' },
    context: {
      app: 'marketing',
      sessionId: 'sess',
      locale: 'en',
      userAgent: 'test',
      page: { url: 'http://x/', path: '/', hash: null, referrer: null, title: 'Home' },
      campaign: {
        source: 'twitter',
        medium: 'social',
        campaign: 'launch',
        content: null,
        term: null,
        gclid: null,
        fbclid: null,
      },
      screen: { width: 800, height: 600 },
      viewport: { width: 800, height: 600 },
    },
    ...overrides,
  }
}

describe('MemoryStore + createIngestHandler', () => {
  it('accepts a valid batch and stores events', async () => {
    const store = new MemoryStore()
    const handler = createIngestHandler({ store, writeKey: 'dev', corsOrigin: true })

    const res = await handler(
      new Request('http://localhost/ingest', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:5173',
          'x-write-key': 'dev',
        },
        body: JSON.stringify({
          schemaVersion: INGEST_SCHEMA_VERSION,
          sentAt: new Date().toISOString(),
          writeKey: null,
          sdk: { name: '@altitudems/analytics', version: '2.1.0' },
          batch: [sampleEvent()],
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(store.list()).toHaveLength(1)
    expect(store.stats().pageviews).toBe(1)
    expect(store.stats().campaigns[0]?.source).toBe('twitter')
  })

  it('rejects invalid events', async () => {
    const store = new MemoryStore()
    const handler = createIngestHandler({ store })
    const res = await handler(
      new Request('http://localhost/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: INGEST_SCHEMA_VERSION,
          sentAt: new Date().toISOString(),
          writeKey: null,
          sdk: { name: 'x', version: '1' },
          batch: [{ id: '1' }],
        }),
      }),
    )
    expect(res.status).toBe(400)
    expect(store.list()).toHaveLength(0)
  })

  it('rejects bad write keys', async () => {
    const store = new MemoryStore()
    const handler = createIngestHandler({ store, writeKey: 'secret' })
    const res = await handler(
      new Request('http://localhost/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: INGEST_SCHEMA_VERSION,
          sentAt: new Date().toISOString(),
          writeKey: 'nope',
          sdk: { name: 'x', version: '1' },
          batch: [],
        }),
      }),
    )
    expect(res.status).toBe(401)
  })
})
