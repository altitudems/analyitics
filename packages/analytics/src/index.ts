/**
 * First-party product / marketing analytics — thin client, not an OTel/PostHog clone.
 *
 * ## Browser
 * ```ts
 * const analytics = createAnalytics({ endpoint: '/api/analytics/ingest', app: 'marketing' })
 * analytics.page()
 * analytics.capture('cta_clicked', { location: 'hero' })
 * analytics.identify('user_123', { email: 'a@b.com' })
 * ```
 *
 * ## Ingest payload
 * POST JSON {@link IngestPayload} to your endpoint; store `batch[]` and query with SQL.
 */

export { createAnalytics } from './client'
export type { Analytics, AnalyticsOptions } from './client'
export type { AnalyticsEvent, Campaign, EventContext, EventProperties, IngestPayload, SdkInfo } from './types'
export { INGEST_SCHEMA_VERSION, isIngestPayload } from './types'
export { parseCampaignFromSearch } from './campaign'
