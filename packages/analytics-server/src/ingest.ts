import { type IngestPayload, parseIngestPayload } from '@altitudems/analytics'
import type { AnalyticsStore } from './store'

export interface IngestHandlerOptions {
  store: AnalyticsStore
  /**
   * Expected project writeKey (from body or `x-write-key` header).
   * Treat as a public project id, not a secret.
   */
  writeKey?: string
  /** Max events accepted per request (default 100). */
  maxBatchSize?: number
  /** Max JSON body bytes (default 256 KiB). */
  maxBodyBytes?: number
  /** CORS Allow-Origin. Prefer an allowlist in production. `true` reflects Origin. */
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
    'access-control-allow-headers': 'content-type, x-write-key, authorization',
    vary: 'Origin',
  }
}

function json(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function resolveWriteKey(request: Request, payload: IngestPayload): string | null {
  const header = request.headers.get('x-write-key')
  if (header) return header
  const auth = request.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  return payload.writeKey
}

/**
 * Framework-agnostic ingest handler (Fetch API).
 * Works with Hono, Cloudflare Workers, Next.js route handlers, etc.
 */
export function createIngestHandler(options: IngestHandlerOptions): (request: Request) => Promise<Response> {
  const { store, writeKey, corsOrigin } = options
  const maxBatchSize = options.maxBatchSize ?? 100
  const maxBodyBytes = options.maxBodyBytes ?? 256 * 1024

  return async (request: Request): Promise<Response> => {
    const cors = corsHeaders(request, corsOrigin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405, cors)
    }

    const raw = await request.text()
    if (raw.length > maxBodyBytes) {
      return json({ error: 'payload_too_large' }, 413, cors)
    }

    let body: unknown
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      return json({ error: 'invalid_json' }, 400, cors)
    }

    const parsed = parseIngestPayload(body)
    if (!parsed.ok) {
      return json({ error: parsed.error, details: parsed.details }, 400, cors)
    }

    const payload = parsed.payload
    if (payload.batch.length > maxBatchSize) {
      return json({ error: 'batch_too_large', details: `max ${maxBatchSize}` }, 413, cors)
    }

    const key = resolveWriteKey(request, payload)
    if (writeKey && key !== writeKey) {
      return json({ error: 'unauthorized' }, 401, cors)
    }

    if (payload.batch.length === 0) {
      return json({ ok: true, accepted: 0 }, 200, cors)
    }

    // Dedupe by event id within the batch
    const seen = new Set<string>()
    const unique = payload.batch.filter((e) => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    await store.insert(unique, {
      sentAt: payload.sentAt,
      writeKey: key,
      sdk: payload.sdk,
      receivedAt: new Date().toISOString(),
    })

    return json({ ok: true, accepted: unique.length }, 200, cors)
  }
}
