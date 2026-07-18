/**
 * @altitudems/analytics — first-party product & marketing analytics for the browser.
 *
 * ```ts
 * const analytics = createAnalytics({
 *   endpoint: '/ingest',
 *   app: 'marketing',
 *   writeKey: 'proj_dev',
 * })
 *
 * analytics.page()
 * analytics.capture('cta_clicked', { location: 'hero' })
 * analytics.identify(userId, { plan: 'pro' })
 * ```
 */

export { createAnalytics, SDK_VERSION } from './client'
export type { Analytics, AnalyticsOptions } from './client'
export type {
  AnalyticsEvent,
  AnalyticsEventType,
  Campaign,
  EventContext,
  EventProperties,
  IngestPayload,
  ParseResult,
  SdkInfo,
} from './types'
export { INGEST_SCHEMA_VERSION, isIngestPayload, parseIngestPayload } from './types'
export { parseCampaignFromSearch, emptyCampaign } from './campaign'
