export const INGEST_SCHEMA_VERSION = 1 as const

export type EventProperties = Record<string, unknown>

export interface Campaign {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
}

export interface EventContext {
  app: string | null
  locale: string | null
  userAgent: string | null
  page: {
    url: string | null
    path: string | null
    referrer: string | null
    title: string | null
  }
  campaign: Campaign
  screen: {
    width: number | null
    height: number | null
  }
}

export interface SdkInfo {
  name: string
  version: string
}

/** Single event in a batch (track, page, or identify). */
export interface AnalyticsEvent {
  id: string
  type: 'track' | 'page' | 'identify'
  /** Required for track; optional label for page */
  event?: string
  name?: string
  timestamp: string
  anonymousId: string
  userId: string | null
  properties: EventProperties
  context: EventContext
}

/** Body POSTed by the browser SDK to your ingest endpoint. */
export interface IngestPayload {
  schemaVersion: typeof INGEST_SCHEMA_VERSION
  sentAt: string
  writeKey: string | null
  sdk: SdkInfo
  batch: AnalyticsEvent[]
}

export function isIngestPayload(value: unknown): value is IngestPayload {
  if (value == null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.schemaVersion === INGEST_SCHEMA_VERSION &&
    typeof v.sentAt === 'string' &&
    Array.isArray(v.batch) &&
    v.sdk != null &&
    typeof v.sdk === 'object'
  )
}
