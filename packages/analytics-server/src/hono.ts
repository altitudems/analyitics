import type { Hono } from 'hono'
import { createIngestHandler, type IngestHandlerOptions } from './ingest'
import type { MemoryStore } from './memory-store'

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
  store: MemoryStore
  /** Default `/events` — list stored events (demo only). */
  eventsPath?: string
  /** Default `/stats` — light website stats (demo only). */
  statsPath?: string
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

/** Demo read APIs backed by MemoryStore — not for production auth models. */
export function registerDemoRoutes(app: Hono, options: RegisterDemoRoutesOptions): void {
  const eventsPath = options.eventsPath ?? '/events'
  const statsPath = options.statsPath ?? '/stats'

  app.get(eventsPath, (c) => {
    applyDemoCors(c, options.corsOrigin)
    return c.json({ events: options.store.list() })
  })

  app.get(statsPath, (c) => {
    applyDemoCors(c, options.corsOrigin)
    return c.json(options.store.stats())
  })
}
