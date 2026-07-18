import { emptyCampaign, mergeFirstTouchCampaign, parseCampaignFromSearch } from './campaign'
import { getPageContext } from './context'
import { createId } from './id'
import { EventQueue } from './queue'
import { getSessionId } from './session'
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
// Bundlers may replace this; keep in sync with package.json on publish.
export const SDK_VERSION = '2.1.0'

const KEY_ANONYMOUS = 'anonymousId'
const KEY_USER = 'userId'
const KEY_CAMPAIGN = 'campaign'
const KEY_OPTED_OUT = 'optedOut'

export interface AnalyticsOptions {
  /** Your ingest URL (absolute or same-origin path). */
  endpoint: string
  /**
   * Project identifier sent with each batch.
   * Not a secret — use a server-side allowlist / header check for real auth.
   */
  writeKey?: string
  /** Distinguishes surfaces: `marketing`, `app`, … */
  app?: string
  /**
   * Auto pageviews.
   * - `true` / `'history'` (default): initial + SPA history changes
   * - `'pageLoad'`: initial only
   * - `false`: manual `page()` only
   */
  capturePageviews?: boolean | 'history' | 'pageLoad'
  /** Flush when queue reaches this size (default 10). */
  flushAt?: number
  /** Max events per HTTP request (default 50). */
  maxBatchSize?: number
  /** Max queued events (default 200); oldest dropped. */
  maxQueueSize?: number
  /** Flush interval in ms (default 2000). `0` disables the timer. */
  flushInterval?: number
  /** Persist queue + ids in localStorage (default true). */
  persist?: boolean
  /** Session idle timeout in ms (default 30 minutes). */
  sessionTimeout?: number
  /** Log pipeline activity to the console. */
  debug?: boolean
  /** Called when a flush fails after retries are scheduled. */
  onError?: (error: { message: string; status?: number }) => void
}

export interface Analytics {
  /** Track a product / UX event. */
  capture(event: string, properties?: EventProperties): void
  /** Alias for `capture` (Segment-style). */
  track(event: string, properties?: EventProperties): void
  /** Record a pageview. */
  page(name?: string, properties?: EventProperties): void
  /** Attach a known user id (and optional traits). */
  identify(userId: string, traits?: EventProperties): void
  /** Clear user, rotate anonymous id, start fresh attribution. */
  reset(): void
  /** Force a flush now. */
  flush(): Promise<void>
  optOut(): void
  optIn(): void
  getAnonymousId(): string
  getUserId(): string | null
  getSessionId(): string
  /** Remove listeners/timers. Safe to call more than once. */
  destroy(): void
}

export function createAnalytics(options: AnalyticsOptions): Analytics {
  if (!options.endpoint) {
    throw new Error(`${SDK_NAME}: \`endpoint\` is required`)
  }

  const persist = options.persist !== false
  const flushAt = options.flushAt ?? 10
  const maxBatchSize = options.maxBatchSize ?? 50
  const maxQueueSize = options.maxQueueSize ?? 200
  const flushInterval = options.flushInterval ?? 2000
  const pageMode = normalizePageMode(options.capturePageviews)
  const app = options.app ?? null
  const writeKey = options.writeKey ?? null
  const sessionTimeout = options.sessionTimeout
  const debug = options.debug ?? false

  const queue = new EventQueue(persist, maxQueueSize)
  let flushing = false
  let destroyed = false
  let backoffUntil = 0
  let timer: ReturnType<typeof setInterval> | null = null

  let anonymousId = (persist ? storageGet(KEY_ANONYMOUS) : null) || createId()
  if (persist) storageSet(KEY_ANONYMOUS, anonymousId)

  let userId: string | null = persist ? storageGet(KEY_USER) : null
  let optedOut = persist ? storageGet(KEY_OPTED_OUT) === '1' : false
  let campaign: Campaign = loadCampaign(persist)

  const unsubscribers: Array<() => void> = []

  function log(...args: unknown[]): void {
    if (debug && typeof console !== 'undefined') console.debug(`[${SDK_NAME}]`, ...args)
  }

  function loadCampaign(usePersist: boolean): Campaign {
    const fromUrl = typeof window !== 'undefined' ? parseCampaignFromSearch(window.location.search) : emptyCampaign()
    const stored = usePersist ? storageGetJson<Campaign>(KEY_CAMPAIGN) : null
    // Migrate old campaign objects missing click-id fields
    const normalizedStored = stored ? { ...emptyCampaign(), ...stored } : null
    const merged = mergeFirstTouchCampaign(normalizedStored, fromUrl)
    if (usePersist) storageSetJson(KEY_CAMPAIGN, merged)
    return merged
  }

  function refreshCampaignFromUrl(): void {
    if (typeof window === 'undefined') return
    const incoming = parseCampaignFromSearch(window.location.search)
    campaign = mergeFirstTouchCampaign(campaign, incoming)
    if (persist) storageSetJson(KEY_CAMPAIGN, campaign)
  }

  function currentSessionId(): string {
    return getSessionId(sessionTimeout)
  }

  function enqueue(partial: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'anonymousId' | 'userId' | 'context'>): void {
    if (optedOut || destroyed) return
    refreshCampaignFromUrl()

    const event: AnalyticsEvent = {
      id: createId(),
      timestamp: new Date().toISOString(),
      anonymousId,
      userId,
      context: getPageContext(campaign, app, currentSessionId()),
      ...partial,
    }

    queue.enqueue(event)
    log('enqueue', event.type, event.event ?? event.name)
    if (queue.size >= flushAt) void flush(false)
  }

  async function flush(useBeacon = false): Promise<void> {
    if (flushing || optedOut || destroyed || queue.size === 0) return
    if (!useBeacon && Date.now() < backoffUntil) return

    flushing = true
    const batch = queue.dequeue(Math.min(maxBatchSize, queue.size))
    const payload: IngestPayload = {
      schemaVersion: INGEST_SCHEMA_VERSION,
      sentAt: new Date().toISOString(),
      writeKey,
      sdk: { name: SDK_NAME, version: SDK_VERSION },
      batch,
    }

    const result = await sendPayload(options.endpoint, payload, {
      useBeacon,
      keepalive: useBeacon,
    })

    if (!result.ok) {
      queue.requeue(batch)
      const delay = result.retryAfterMs ?? (useBeacon ? 0 : 5_000)
      backoffUntil = Date.now() + delay
      log('flush failed', result.status, `retry in ${delay}ms`)
      options.onError?.({ message: 'flush_failed', status: result.status })
    } else {
      backoffUntil = 0
      log('flush ok', batch.length)
    }

    flushing = false

    if (result.ok && queue.size >= flushAt) {
      await flush(useBeacon)
    }
  }

  function onPageHide(): void {
    void flush(true)
  }

  function onVisibility(): void {
    if (document.visibilityState === 'hidden') void flush(true)
  }

  function onOnline(): void {
    void flush(false)
  }

  function bindLifecycle(): void {
    if (typeof window === 'undefined') return
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    unsubscribers.push(() => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
    })
  }

  function emitPageview(name?: string, properties: EventProperties = {}): void {
    enqueue({
      type: 'page',
      event: 'pageview',
      name,
      properties: {
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        hash: typeof window !== 'undefined' ? window.location.hash || undefined : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        title: typeof document !== 'undefined' ? document.title : undefined,
        ...properties,
      },
    })
  }

  function bindHistory(): void {
    if (pageMode !== 'history' || typeof window === 'undefined') return

    const onNav = () => {
      queueMicrotask(() => {
        if (!destroyed) emitPageview()
      })
    }

    if (window.history) {
      for (const method of ['pushState', 'replaceState'] as const) {
        const original = window.history[method].bind(window.history)
        const patched = ((...args: Parameters<History['pushState']>) => {
          const ret = original(...args)
          onNav()
          return ret
        }) as History['pushState']

        try {
          Object.defineProperty(window.history, method, {
            configurable: true,
            writable: true,
            value: patched,
          })
          unsubscribers.push(() => {
            Object.defineProperty(window.history, method, {
              configurable: true,
              writable: true,
              value: original,
            })
          })
        } catch {
          // Some environments freeze History methods — hashchange still covers many SPAs
        }
      }
    }

    window.addEventListener('popstate', onNav)
    window.addEventListener('hashchange', onNav)
    unsubscribers.push(() => {
      window.removeEventListener('popstate', onNav)
      window.removeEventListener('hashchange', onNav)
    })
  }

  function startTimer(): void {
    if (flushInterval <= 0 || typeof setInterval === 'undefined') return
    timer = setInterval(() => {
      void flush(false)
    }, flushInterval)
  }

  const api: Analytics = {
    capture(event, properties = {}) {
      enqueue({ type: 'track', event, properties })
    },

    track(event, properties = {}) {
      api.capture(event, properties)
    },

    page(name, properties = {}) {
      emitPageview(name, properties)
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
      refreshCampaignFromUrl()
      log('reset', anonymousId)
    },

    async flush() {
      await flush(false)
    },

    optOut() {
      optedOut = true
      if (persist) storageSet(KEY_OPTED_OUT, '1')
      queue.clear()
      log('optOut')
    },

    optIn() {
      optedOut = false
      if (persist) storageRemove(KEY_OPTED_OUT)
      log('optIn')
    },

    getAnonymousId() {
      return anonymousId
    },

    getUserId() {
      return userId
    },

    getSessionId() {
      return currentSessionId()
    },

    destroy() {
      if (destroyed) return
      destroyed = true
      if (timer) clearInterval(timer)
      timer = null
      for (const off of unsubscribers.splice(0)) off()
      log('destroy')
    },
  }

  bindLifecycle()
  bindHistory()
  startTimer()

  if (pageMode !== false) emitPageview()

  if (queue.size > 0) void flush(false)

  return api
}

function normalizePageMode(value: AnalyticsOptions['capturePageviews']): false | 'history' | 'pageLoad' {
  if (value === false) return false
  if (value === 'pageLoad') return 'pageLoad'
  return 'history'
}
