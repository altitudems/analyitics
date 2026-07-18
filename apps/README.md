# Examples

## Run the full demo

```bash
pnpm install
pnpm dev
```

- Marketing site: http://localhost:5173
- Fake app: http://localhost:5174
- Ingest API: http://localhost:8787

Try a campaign link:

http://localhost:5173/?utm_source=twitter&utm_medium=social&utm_campaign=launch

Then open the app, click actions, and hit **Refresh stats** (or `GET http://localhost:8787/stats`).

## Packages used

| Package                         | Role                                            |
| ------------------------------- | ----------------------------------------------- |
| `@altitudems/analytics`         | Browser SDK                                     |
| `@altitudems/analytics-server`  | `AnalyticsStore` + ingest handler (Hono helper) |
| `@altitudems/example-api`       | Hono + `MemoryStore`                            |
| `@altitudems/example-marketing` | Harbor marketing page                           |
| `@altitudems/example-app`       | Fake signed-in product shell                    |

Wire your own DB by implementing `AnalyticsStore.insert` and passing it to `createIngestHandler` / `registerIngest`.
