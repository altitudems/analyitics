import { Hono } from 'hono'
import { buildHarborSeedEvents, seedHarborDemo } from './demo-seed'
import { registerDemoRoutes } from './hono'
import { MemoryStore } from './memory-store'

describe('Harbor demo helpers', () => {
  it('seeds a busy history with pages, tracks, and campaigns', async () => {
    const store = new MemoryStore()
    const count = await seedHarborDemo(store, new Date('2026-07-18T12:00:00.000Z'))
    const stats = store.stats()

    expect(count).toBeGreaterThan(100)
    expect(stats.totalEvents).toBe(count)
    expect(stats.pageviews).toBeGreaterThan(50)
    expect(stats.tracks).toBeGreaterThan(20)
    expect(stats.uniqueAnonymous).toBeGreaterThan(4)
    expect(stats.identifiedUsers).toBeGreaterThan(2)
    expect(stats.topPages.length).toBeGreaterThan(2)
    expect(stats.campaigns.some((c) => c.source === 'twitter')).toBe(true)
    expect(stats.topEvents[0]?.event).toBeTruthy()
    expect(buildHarborSeedEvents().every((e) => e.id.startsWith('seed_'))).toBe(true)
  })

  it('notifies subscribers on insert', async () => {
    const store = new MemoryStore()
    const seen: number[] = []
    const stop = store.subscribe((added, stats) => {
      seen.push(added.length)
      expect(stats.totalEvents).toBeGreaterThan(0)
    })

    await seedHarborDemo(store)
    expect(seen).toEqual([store.list().length])
    stop()
  })

  it('streams snapshot + batch over SSE', async () => {
    const store = new MemoryStore()
    await seedHarborDemo(store, new Date('2026-07-18T12:00:00.000Z'))
    const app = new Hono()
    registerDemoRoutes(app, { store })

    const res = await app.request('/stream')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const deadline = Date.now() + 2000

    while (!buffer.includes('event: snapshot') && Date.now() < deadline) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
    }

    expect(buffer).toContain('event: snapshot')
    expect(buffer).toContain('"totalEvents"')

    const insertPromise = store.insert(
      [
        {
          id: 'sse_live_1',
          type: 'track',
          event: 'feature_used',
          timestamp: new Date().toISOString(),
          anonymousId: 'anon_sse',
          userId: null,
          properties: { path: '/' },
          context: {
            app: 'app',
            sessionId: 'sess',
            locale: 'en',
            userAgent: 'test',
            page: { url: 'http://x/', path: '/', hash: null, referrer: null, title: 'Home' },
            campaign: {
              source: null,
              medium: null,
              campaign: null,
              content: null,
              term: null,
              gclid: null,
              fbclid: null,
            },
            screen: { width: 800, height: 600 },
            viewport: { width: 800, height: 600 },
          },
        },
      ],
      {
        sentAt: new Date().toISOString(),
        writeKey: 'test',
        sdk: { name: 'test', version: '1' },
        receivedAt: new Date().toISOString(),
      },
    )

    while (!buffer.includes('event: batch') && Date.now() < deadline) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
    }

    await insertPromise
    // drain a bit more in case batch arrived after insert resolved
    if (!buffer.includes('event: batch')) {
      const { value } = await reader.read()
      if (value) buffer += decoder.decode(value)
    }

    expect(buffer).toContain('event: batch')
    expect(buffer).toContain('sse_live_1')
    await reader.cancel()
  })
})
