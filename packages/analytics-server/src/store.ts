import type { AnalyticsEvent, SdkInfo } from '@altitudems/analytics'

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
 * Implement this to persist events anywhere you like.
 * The SDK never owns your database.
 *
 * ```ts
 * const store: AnalyticsStore = {
 *   async insert(events, meta) {
 *     await db.insert('analytics_events').values(events.map(e => ({ ...e, received_at: meta.receivedAt })))
 *   }
 * }
 * ```
 */
export interface AnalyticsStore {
  insert(events: AnalyticsEvent[], meta: IngestMeta): Promise<void>
}

/** Optional read helpers used by demo dashboards. */
export interface AnalyticsReadableStore extends AnalyticsStore {
  list(): StoredEvent[]
  stats(): AnalyticsStats
}

export interface PageStat {
  path: string
  views: number
}

export interface CampaignStat {
  source: string
  medium: string
  campaign: string
  events: number
}

export interface AnalyticsStats {
  totalEvents: number
  pageviews: number
  tracks: number
  uniqueAnonymous: number
  identifiedUsers: number
  topPages: PageStat[]
  campaigns: CampaignStat[]
  topEvents: Array<{ event: string; count: number }>
}

export type { AnalyticsEvent, SdkInfo }
