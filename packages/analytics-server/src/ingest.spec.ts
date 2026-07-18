import { INGEST_SCHEMA_VERSION } from '@altitudems/analytics'
import { createIngestHandler } from './ingest'
import { MemoryStore } from './memory-store'

describe('MemoryStore + createIngestHandler', () => {
  it('accepts a valid batch and stores events', async () => {
    const store = new MemoryStore()
    const handler = createIngestHandler({ store, writeKey: 'dev', corsOrigin: true })

    const res = await handler(
      new Request('http://localhost/ingest', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
        body: JSON.stringify({
          schemaVersion: INGEST_SCHEMA_VERSION,
          sentAt: new Date().toISOString(),
          writeKey: 'dev',
          sdk: { name: '@altitudems/analytics', version: '2.0.0' },
          batch: [
            {
              id: '1',
              type: 'page',
              event: 'pageview',
              timestamp: new Date().toISOString(),
              anonymousId: 'anon',
              userId: null,
              properties: { path: '/' },
              context: {
                app: 'marketing',
                locale: 'en',
                userAgent: 'test',
                page: { url: 'http://x/', path: '/', referrer: null, title: 'Home' },
                campaign: {
                  source: 'twitter',
                  medium: 'social',
                  campaign: 'launch',
                  content: null,
                  term: null,
                },
                screen: { width: 800, height: 600 },
              },
            },
          ],
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(store.list()).toHaveLength(1)
    expect(store.stats().pageviews).toBe(1)
    expect(store.stats().campaigns[0]?.source).toBe('twitter')
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
