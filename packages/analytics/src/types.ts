/** Shared ingest contract — schemaVersion 1 */

export const INGEST_SCHEMA_VERSION = 1 as const

export type EventProperties = Record<string, unknown>

export interface Campaign {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
  /** Ad click ids when present */
  gclid: string | null
  fbclid: string | null
}

export interface EventContext {
  app: string | null
  sessionId: string | null
  locale: string | null
  userAgent: string | null
  page: {
    url: string | null
    path: string | null
    hash: string | null
    referrer: string | null
    title: string | null
  }
  campaign: Campaign
  screen: {
    width: number | null
    height: number | null
  }
  viewport: {
    width: number | null
    height: number | null
  }
}

export interface SdkInfo {
  name: string
  version: string
}

export type AnalyticsEventType = 'track' | 'page' | 'identify'

export interface AnalyticsEvent {
  id: string
  type: AnalyticsEventType
  event?: string
  name?: string
  timestamp: string
  anonymousId: string
  userId: string | null
  properties: EventProperties
  context: EventContext
}

export interface IngestPayload {
  schemaVersion: typeof INGEST_SCHEMA_VERSION
  sentAt: string
  writeKey: string | null
  sdk: SdkInfo
  batch: AnalyticsEvent[]
}

export type ParseResult = { ok: true; payload: IngestPayload } | { ok: false; error: string; details?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isCampaign(value: unknown): value is Campaign {
  if (!isRecord(value)) return false
  const keys = ['source', 'medium', 'campaign', 'content', 'term', 'gclid', 'fbclid'] as const
  return keys.every((k) => value[k] === null || typeof value[k] === 'string')
}

function isEventContext(value: unknown): value is EventContext {
  if (!isRecord(value)) return false
  if (!isRecord(value.page) || !isRecord(value.screen) || !isRecord(value.viewport)) return false
  if (!isCampaign(value.campaign)) return false
  return true
}

function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || !value.id) return false
  if (value.type !== 'track' && value.type !== 'page' && value.type !== 'identify') return false
  if (typeof value.timestamp !== 'string') return false
  if (typeof value.anonymousId !== 'string' || !value.anonymousId) return false
  if (!(value.userId === null || typeof value.userId === 'string')) return false
  if (!isRecord(value.properties)) return false
  if (!isEventContext(value.context)) return false
  if (value.event != null && typeof value.event !== 'string') return false
  if (value.name != null && typeof value.name !== 'string') return false
  return true
}

/** Deep validation for ingest bodies. Prefer this on the server. */
export function parseIngestPayload(value: unknown): ParseResult {
  if (!isRecord(value)) return { ok: false, error: 'invalid_payload', details: 'body must be an object' }
  if (value.schemaVersion !== INGEST_SCHEMA_VERSION) {
    return { ok: false, error: 'unsupported_schema', details: `expected schemaVersion ${INGEST_SCHEMA_VERSION}` }
  }
  if (typeof value.sentAt !== 'string') return { ok: false, error: 'invalid_payload', details: 'sentAt' }
  if (!(value.writeKey === null || typeof value.writeKey === 'string')) {
    return { ok: false, error: 'invalid_payload', details: 'writeKey' }
  }
  if (!isRecord(value.sdk) || typeof value.sdk.name !== 'string' || typeof value.sdk.version !== 'string') {
    return { ok: false, error: 'invalid_payload', details: 'sdk' }
  }
  if (!Array.isArray(value.batch)) return { ok: false, error: 'invalid_payload', details: 'batch' }

  for (let i = 0; i < value.batch.length; i++) {
    if (!isAnalyticsEvent(value.batch[i])) {
      return { ok: false, error: 'invalid_event', details: `batch[${i}]` }
    }
  }

  return {
    ok: true,
    payload: value as unknown as IngestPayload,
  }
}

export function isIngestPayload(value: unknown): value is IngestPayload {
  return parseIngestPayload(value).ok
}
