import type { AnalyticsEvent } from '@altitudems/analytics'
import type { AnalyticsStore, IngestMeta, StoredEvent } from './store'

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

/** In-memory store for tests and local demos. Swap for your DB in production. */
export class MemoryStore implements AnalyticsStore {
  readonly events: StoredEvent[] = []

  async insert(events: AnalyticsEvent[], meta: IngestMeta): Promise<void> {
    for (const event of events) {
      this.events.push({
        ...event,
        receivedAt: meta.receivedAt,
        writeKey: meta.writeKey,
        sdk: meta.sdk,
      })
    }
  }

  clear(): void {
    this.events.length = 0
  }

  list(): StoredEvent[] {
    return [...this.events]
  }

  /** Light website stats helpers for demos / admin. */
  stats(): {
    totalEvents: number
    pageviews: number
    uniqueAnonymous: number
    topPages: PageStat[]
    campaigns: CampaignStat[]
  } {
    const pageviews = this.events.filter((e) => e.type === 'page' || e.event === 'pageview')
    const uniques = new Set(this.events.map((e) => e.anonymousId))

    const byPath = new Map<string, number>()
    for (const e of pageviews) {
      const pathValue = e.properties.path ?? e.context.page.path ?? '/'
      const path = typeof pathValue === 'string' ? pathValue : '/'
      byPath.set(path, (byPath.get(path) ?? 0) + 1)
    }

    const byCampaign = new Map<string, CampaignStat>()
    for (const e of this.events) {
      const c = e.context.campaign
      if (!c.source && !c.medium && !c.campaign) continue
      const key = `${c.source ?? ''}|${c.medium ?? ''}|${c.campaign ?? ''}`
      const row = byCampaign.get(key) ?? {
        source: c.source ?? '(none)',
        medium: c.medium ?? '(none)',
        campaign: c.campaign ?? '(none)',
        events: 0,
      }
      row.events += 1
      byCampaign.set(key, row)
    }

    return {
      totalEvents: this.events.length,
      pageviews: pageviews.length,
      uniqueAnonymous: uniques.size,
      topPages: [...byPath.entries()].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views),
      campaigns: [...byCampaign.values()].sort((a, b) => b.events - a.events),
    }
  }
}
