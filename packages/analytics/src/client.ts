import { mergeFirstTouchCampaign, parseCampaignFromSearch } from './campaign'
import { getPageContext } from './context'
import { createId } from './id'
import { EventQueue } from './queue'
import { storageGet, storageGetJson, storageRemove, storageSet, storageSetJson } from './storage'
import { sendPayload } from './transport'
import {
  type AnalyticsEvent,
  type Campaign,
  type EventProperties,
  INGEST_SCHEMA_VERSION,
  type IngestPayload,
} from './types'

const SDK_NAME = '@altitudems/analytics'
const SDK_VERSION = '2.0.0'

const KEY_ANONYMOUS = 'anonymousId'
const KEY_USER = 'userId'
const KEY_CAMPAIGN = 'campaign'
const KEY_OPTED_OUT = 'optedOut'

export interface AnalyticsOptions {
  /** Your ingest URL (absolute or same-origin path). */
  endpoint: string
  /** Optional key your server can validate. */
  writeKey?: string
  /** Distinguishes marketing site vs app, etc. */
  app?: string
  /** Auto-send a page event on init (default true). */
  capturePageviews?: boolean
  /** Flush when queue reaches this size (default 10). */
  flushAt?: number
  /** Flush interval in ms (default 2000). 0 disables timer. */
  flushInterval?: number
  /** Persist queue + ids in localStorage (default true). */
  persist?: boolean
}

export interface Analytics {
  capture(event: string, properties?: EventProperties): void
  page(name?: string, properties?: EventProperties): void
  identify(userId: string, traits?: EventProperties): void
  reset(): void
  flush(): Promise<void>
  optOut(): void
  optIn(): void
  getAnonymousId(): string
  getUserId(): string | null
}

export function createAnalytics(options: AnalyticsOptions): Analytics {
  if (!options.endpoint) {
    throw new Error('@altitudems/analytics: endpoint is required')
  }

  const persist = options.persist !== false
  const flushAt = options.flushAt ?? 10
  const flushInterval = options.flushInterval ?? 2000
  const capturePageviews = options.capturePageviews !== false
  const app = options.app ?? null
  const writeKey = options.writeKey ?? null

  const queue = new EventQueue(persist)
  let flushing = false

  let anonymousId = (persist ? storageGet(KEY_ANONYMOUS) : null) || createId()
  if (persist) storageSet(KEY_ANONYMOUS, anonymousId)

  let userId: string | null = persist ? storageGet(KEY_USER) : null
  let optedOut = persist ? storageGet(KEY_OPTED_OUT) === '1' : false

  let campaign: Campaign = loadCampaign(persist)

  function loadCampaign(usePersist: boolean): Campaign {
    const fromUrl = typeof window !== 'undefined' ? parseCampaignFromSearch(window.location.search) : emptyCampaign()
    const stored = usePersist ? storageGetJson<Campaign>(KEY_CAMPAIGN) : null
    const merged = mergeFirstTouchCampaign(stored, fromUrl)
    if (usePersist) storageSetJson(KEY_CAMPAIGN, merged)
    return merged
  }

  function emptyCampaign(): Campaign {
    return { source: null, medium: null, campaign: null, content: null, term: null }
  }

  function refreshCampaignFromUrl(): void {
    if (typeof window === 'undefined') return
    const incoming = parseCampaignFromSearch(window.location.search)
    campaign = mergeFirstTouchCampaign(campaign, incoming)
    if (persist) storageSetJson(KEY_CAMPAIGN, campaign)
  }

  function enqueue(partial: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'anonymousId' | 'userId' | 'context'>): void {
    if (optedOut) return
    refreshCampaignFromUrl()

    const event: AnalyticsEvent = {
      id: createId(),
      timestamp: new Date().toISOString(),
      anonymousId,
      userId,
      context: getPageContext(campaign, app),
      ...partial,
    }

    queue.enqueue(event)
    if (queue.size >= flushAt) {
      void flush()
    }
  }

  async function flush(useBeacon = false): Promise<void> {
    if (flushing || optedOut || queue.size === 0) return
    flushing = true

    const batch = queue.dequeue(Math.max(flushAt, queue.size))
    const payload: IngestPayload = {
      schemaVersion: INGEST_SCHEMA_VERSION,
      sentAt: new Date().toISOString(),
      writeKey,
      sdk: { name: SDK_NAME, version: SDK_VERSION },
      batch,
    }

    const ok = await sendPayload(options.endpoint, payload, {
      useBeacon,
      keepalive: useBeacon,
    })

    if (!ok) {
      queue.requeue(batch)
    }

    flushing = false

    // If more piled up during flush, continue
    if (ok && queue.size >= flushAt) {
      await flush(useBeacon)
    }
  }

  function onPageHide(): void {
    void flush(true)
  }

  function startTimer(): void {
    if (flushInterval <= 0 || typeof setInterval === 'undefined') return
    setInterval(() => {
      void flush()
    }, flushInterval)
  }

  function bindLifecycle(): void {
    if (typeof window === 'undefined') return
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush(true)
    })
  }

  const api: Analytics = {
    capture(event, properties = {}) {
      enqueue({ type: 'track', event, properties })
    },

    page(name, properties = {}) {
      enqueue({
        type: 'page',
        event: 'pageview',
        name,
        properties: {
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          title: typeof document !== 'undefined' ? document.title : undefined,
          ...properties,
        },
      })
    },

    identify(id, traits = {}) {
      userId = id
      if (persist) storageSet(KEY_USER, id)
      enqueue({ type: 'identify', event: 'identify', properties: traits })
    },

    reset() {
      userId = null
      anonymousId = createId()
      campaign = emptyCampaign()
      if (persist) {
        storageRemove(KEY_USER)
        storageSet(KEY_ANONYMOUS, anonymousId)
        storageSetJson(KEY_CAMPAIGN, campaign)
      }
      // Re-read UTMs from current URL as new first touch
      refreshCampaignFromUrl()
    },

    async flush() {
      await flush(false)
    },

    optOut() {
      optedOut = true
      if (persist) storageSet(KEY_OPTED_OUT, '1')
      queue.clear()
    },

    optIn() {
      optedOut = false
      if (persist) storageRemove(KEY_OPTED_OUT)
    },

    getAnonymousId() {
      return anonymousId
    },

    getUserId() {
      return userId
    },
  }

  bindLifecycle()
  startTimer()

  if (capturePageviews) {
    api.page()
  }

  // Flush anything restored from a previous session
  if (queue.size > 0) {
    void flush()
  }

  return api
}
