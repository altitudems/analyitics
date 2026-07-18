import type { AnalyticsEvent, IngestPayload, SdkInfo } from '@altitudems/analytics'

export interface IngestMeta {
  sentAt: string
  writeKey: string | null
  sdk: SdkInfo
  receivedAt: string
}

export interface StoredEvent extends AnalyticsEvent {
  receivedAt: string
  writeKey: string | null
  sdk: SdkInfo
}

/**
 * Implement this to persist events (Postgres, ClickHouse, files, …).
 * The server package does not own your database.
 */
export interface AnalyticsStore {
  insert(events: AnalyticsEvent[], meta: IngestMeta): Promise<void>
}

export type { AnalyticsEvent, IngestPayload, SdkInfo }
