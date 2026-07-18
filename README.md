# analyitics

First-party analytics you own — browser SDK, pluggable ingest, zero vendors.

```bash
pnpm install
pnpm dev
```

|           |                                |
| --------- | ------------------------------ |
| Marketing | http://localhost:5173          |
| App       | http://localhost:5173/app.html |
| API       | http://localhost:8787          |

```ts
// browser
import { createAnalytics } from '@altitudems/analytics'
const analytics = createAnalytics({ endpoint: '/ingest', app: 'app' })
analytics.capture('feature_used')

// server
import { registerIngest, type AnalyticsStore } from '@altitudems/analytics-server'
registerIngest(app, { store: myStore, writeKey: '…' })
```

Built with **Vite+** (`vp check`, `vp test`, `vp pack`).
