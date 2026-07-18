# @altitudems/analytics

First-party **product + marketing** analytics for the browser.  
Not PostHog. Not OpenTelemetry. Just events you own.

```ts
import { createAnalytics } from '@altitudems/analytics'

const analytics = createAnalytics({
  endpoint: '/ingest',
  app: 'marketing',
  writeKey: 'proj_dev',
})

analytics.page()
analytics.capture('cta_clicked', { location: 'hero' })
analytics.identify(userId, { plan: 'pro' })
await analytics.flush()
```

## What you get

- `capture` / `track`, `page`, `identify`, `reset`
- First-touch UTMs + `gclid` / `fbclid`
- Session ids, anonymous → user stitching
- SPA history pageviews
- Batched flush + `sendBeacon` on unload + online retry
- Opt-out, `destroy()`, debug logging

## Pair with

`@altitudems/analytics-server` — pluggable `AnalyticsStore` + Hono/fetch ingest.
