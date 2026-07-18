export type { AnalyticsEvent, Campaign, EventContext, IngestPayload, ParseResult, SdkInfo } from '@altitudems/analytics'
export { INGEST_SCHEMA_VERSION, isIngestPayload, parseIngestPayload } from '@altitudems/analytics'

export type {
  AnalyticsReadableStore,
  AnalyticsStats,
  AnalyticsStore,
  CampaignStat,
  IngestMeta,
  PageStat,
  StoredEvent,
} from './store'
export { MemoryStore } from './memory-store'
export { createIngestHandler } from './ingest'
export type { IngestHandlerOptions } from './ingest'
export { registerDemoRoutes, registerIngest } from './hono'
export type { RegisterDemoRoutesOptions, RegisterIngestOptions } from './hono'
