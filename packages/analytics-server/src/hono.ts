import type { Hono } from 'hono'
import { createIngestHandler, type IngestHandlerOptions } from './ingest'
import type { MemoryStore } from './memory-store'
import type { AnalyticsReadableStore, AnalyticsStats, StoredEvent } from './store'

export interface RegisterIngestOptions extends IngestHandlerOptions {
  /** Default `/ingest` */
  path?: string
}

/** Mount POST (+ OPTIONS) ingest on a Hono app. */
export function registerIngest(app: Hono, options: RegisterIngestOptions): void {
  const path = options.path ?? '/ingest'
  const handler = createIngestHandler(options)

  app.options(path, (c) => handler(c.req.raw))
  app.post(path, (c) => handler(c.req.raw))
}

export interface RegisterDemoRoutesOptions {
  store: AnalyticsReadableStore
  eventsPath?: string
  statsPath?: string
  /** Default `/stream` — SSE snapshot + live inserts. Requires MemoryStore.subscribe. */
  streamPath?: string | false
  corsOrigin?: string | string[] | true
}

function applyDemoCors(
  c: { header: (name: string, value: string) => void; req: { raw: Request } },
  originSetting?: string | string[] | true,
): void {
  if (originSetting == null) return
  const origin = c.req.raw.headers.get('origin')
  let allow: string | null = null
  if (originSetting === true) allow = origin
  else if (typeof originSetting === 'string') allow = originSetting
  else if (origin && originSetting.includes(origin)) allow = origin
  if (allow) {
    c.header('access-control-allow-origin', allow)
    c.header('vary', 'Origin')
  }
}

function hasSubscribe(store: AnalyticsReadableStore): store is MemoryStore {
  return typeof (store as MemoryStore).subscribe === 'function'
}

interface StreamSnapshot {
  stats: AnalyticsStats
  events: StoredEvent[]
}

interface StreamBatch {
  events: StoredEvent[]
  stats: AnalyticsStats
}

/**
 * Demo read APIs — great for local dashboards, not a production auth model.
 * Protect or remove these before shipping.
 *
 * Includes optional SSE at `/stream`:
 * - `event: snapshot` — current stats + recent events
 * - `event: batch` — newly inserted events + updated stats
 */
export function registerDemoRoutes(app: Hono, options: RegisterDemoRoutesOptions): void {
  const eventsPath = options.eventsPath ?? '/events'
  const statsPath = options.statsPath ?? '/stats'
  const streamPath = options.streamPath === false ? null : (options.streamPath ?? '/stream')

  app.get(eventsPath, (c) => {
    applyDemoCors(c, options.corsOrigin)
    return c.json({ events: options.store.list() })
  })

  app.get(statsPath, (c) => {
    applyDemoCors(c, options.corsOrigin)
    return c.json(options.store.stats())
  })

  if (!streamPath) return
  if (!hasSubscribe(options.store)) return
  const liveStore = options.store

  app.get(streamPath, (c) => {
    applyDemoCors(c, options.corsOrigin)
    const encoder = new TextEncoder()
    let heartbeat: ReturnType<typeof setInterval> | null = null
    let unsubscribe: (() => void) | null = null

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        const snapshot: StreamSnapshot = {
          stats: liveStore.stats(),
          events: liveStore.list().slice(-120),
        }
        send('snapshot', snapshot)

        unsubscribe = liveStore.subscribe((added, stats) => {
          const batch: StreamBatch = { events: added, stats }
          try {
            send('batch', batch)
          } catch {
            // Client gone
          }
        })

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`))
          } catch {
            // ignore
          }
        }, 15_000)

        c.req.raw.signal.addEventListener('abort', () => {
          if (heartbeat) clearInterval(heartbeat)
          heartbeat = null
          unsubscribe?.()
          unsubscribe = null
          try {
            controller.close()
          } catch {
            // already closed
          }
        })
      },
      cancel() {
        if (heartbeat) clearInterval(heartbeat)
        unsubscribe?.()
      },
    })

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      },
    })
  })
}
