import { type IngestPayload, isIngestPayload } from '@altitudems/analytics'
import type { AnalyticsStore } from './store'

export interface IngestHandlerOptions {
  store: AnalyticsStore
  /** If set, reject batches whose writeKey does not match. */
  writeKey?: string
  /** CORS Allow-Origin value(s). Use `true` to reflect request Origin. */
  corsOrigin?: string | string[] | true
}

function corsHeaders(request: Request, corsOrigin?: string | string[] | true): Record<string, string> {
  if (corsOrigin == null) return {}
  const origin = request.headers.get('origin')
  let allow: string | null = null
  if (corsOrigin === true) allow = origin
  else if (typeof corsOrigin === 'string') allow = corsOrigin
  else if (origin && corsOrigin.includes(origin)) allow = origin

  if (!allow) return {}
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'POST, OPTIONS, GET',
    'access-control-allow-headers': 'content-type',
    vary: 'Origin',
  }
}

function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

/**
 * Framework-agnostic ingest handler (Fetch API).
 * Mount on `POST /ingest` (or any path) in Hono, Cloudflare, Next route handlers, etc.
 */
export function createIngestHandler(options: IngestHandlerOptions): (request: Request) => Promise<Response> {
  const { store, writeKey, corsOrigin } = options

  return async (request: Request): Promise<Response> => {
    const cors = corsHeaders(request, corsOrigin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, cors)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: 'invalid_json' }, 400, cors)
    }

    if (!isIngestPayload(body)) {
      return json({ error: 'invalid_payload' }, 400, cors)
    }

    const payload = body as IngestPayload
    if (writeKey && payload.writeKey !== writeKey) {
      return json({ error: 'unauthorized' }, 401, cors)
    }

    if (payload.batch.length === 0) {
      return json({ ok: true, accepted: 0 }, 200, cors)
    }

    await store.insert(payload.batch, {
      sentAt: payload.sentAt,
      writeKey: payload.writeKey,
      sdk: payload.sdk,
      receivedAt: new Date().toISOString(),
    })

    return json({ ok: true, accepted: payload.batch.length }, 200, cors)
  }
}
