# First-party analytics (this package)

Thin browser SDK for product + marketing events. Not PostHog. Not OTel.

## API

```ts
import { createAnalytics } from '@altitudems/analytics'

const analytics = createAnalytics({
  endpoint: '/api/analytics/ingest',
  app: 'marketing', // or 'app'
  writeKey: 'optional-server-check',
})

analytics.page()
analytics.capture('cta_clicked', { location: 'hero' })
analytics.identify(userId, { plan: 'pro' })
analytics.reset() // logout
await analytics.flush()
```

## Ingest

`POST` JSON `IngestPayload` (`schemaVersion: 1`) with a `batch` of events.
Store rows; query with SQL for pageviews, campaigns, funnels.

Suggested table: `id, type, event, timestamp, anonymous_id, user_id, properties jsonb, context jsonb`.

## Website stats

`page` / auto pageviews + SQL on `path`, `context.campaign`, `anonymousId`.
