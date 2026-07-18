import type { AnalyticsEvent } from '@altitudems/analytics'
import type { AnalyticsReadableStore, AnalyticsStats, CampaignStat, IngestMeta, PageStat, StoredEvent } from './store'

export type MemoryStoreListener = (added: StoredEvent[], stats: AnalyticsStats) => void

/** In-memory store for tests and local demos. Swap for your DB in production. */
export class MemoryStore implements AnalyticsReadableStore {
  readonly events: StoredEvent[] = []
  readonly #listeners = new Set<MemoryStoreListener>()

  async insert(events: AnalyticsEvent[], meta: IngestMeta): Promise<void> {
    const added: StoredEvent[] = []
    for (const event of events) {
      const row: StoredEvent = {
        ...event,
        receivedAt: meta.receivedAt,
        writeKey: meta.writeKey,
        sdk: meta.sdk,
      }
      this.events.push(row)
      added.push(row)
    }
    if (added.length === 0) return
    const stats = this.stats()
    for (const listener of this.#listeners) listener(added, stats)
  }

  /** Notify on every successful insert. Returns unsubscribe. */
  subscribe(listener: MemoryStoreListener): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  clear(): void {
    this.events.length = 0
  }

  list(): StoredEvent[] {
    return [...this.events]
  }

  stats(): AnalyticsStats {
    const pageviews = this.events.filter((e) => e.type === 'page' || e.event === 'pageview')
    const tracks = this.events.filter((e) => e.type === 'track')
    const uniques = new Set(this.events.map((e) => e.anonymousId))
    const users = new Set(this.events.map((e) => e.userId).filter(Boolean) as string[])

    const byPath = new Map<string, number>()
    for (const e of pageviews) {
      const pathValue = e.properties.path ?? e.context.page.path ?? '/'
      const path = typeof pathValue === 'string' ? pathValue : '/'
      const hashValue = e.properties.hash ?? e.context.page.hash
      const hash = typeof hashValue === 'string' ? hashValue : ''
      const key = path + hash
      byPath.set(key, (byPath.get(key) ?? 0) + 1)
    }

    const byCampaign = new Map<string, CampaignStat>()
    for (const e of this.events) {
      const c = e.context.campaign
      if (!c.source && !c.medium && !c.campaign && !c.gclid && !c.fbclid) continue
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

    const byEvent = new Map<string, number>()
    for (const e of tracks) {
      const name = e.event ?? 'unknown'
      byEvent.set(name, (byEvent.get(name) ?? 0) + 1)
    }

    return {
      totalEvents: this.events.length,
      pageviews: pageviews.length,
      tracks: tracks.length,
      uniqueAnonymous: uniques.size,
      identifiedUsers: users.size,
      topPages: [...byPath.entries()]
        .map(([path, views]) => ({ path, views }) satisfies PageStat)
        .sort((a, b) => b.views - a.views),
      campaigns: [...byCampaign.values()].sort((a, b) => b.events - a.events),
      topEvents: [...byEvent.entries()].map(([event, count]) => ({ event, count })).sort((a, b) => b.count - a.count),
    }
  }
}
