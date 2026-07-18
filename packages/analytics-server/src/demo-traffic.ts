import type { AnalyticsEvent } from '@altitudems/analytics'
import type { AnalyticsStore, IngestMeta } from './store'

const SDK = { name: '@altitudems/analytics', version: '2.1.0' } as const

const ANONS = ['anon_live_a', 'anon_live_b', 'anon_live_c', 'anon_mira', 'anon_sam', 'anon_rio']
const USERS = [null, null, 'user_mira', 'user_alex', 'user_kai', null] as const
const PATHS = [
  { app: 'marketing', path: '/', hash: null as string | null, title: 'Harbor' },
  { app: 'marketing', path: '/pricing', hash: null, title: 'Pricing · Harbor' },
  { app: 'app', path: '/app.html', hash: '#/releases', title: 'Releases · Harbor' },
  { app: 'app', path: '/app.html', hash: '#/settings', title: 'Settings · Harbor' },
]
const TRACKS = ['cta_clicked', 'feature_used', 'invite_teammate', 'release_created', 'signup_started'] as const
const CAMPAIGNS = [
  { source: 'twitter', medium: 'social', campaign: 'launch' },
  { source: 'google', medium: 'cpc', campaign: 'spring_releases' },
  { source: 'newsletter', medium: 'email', campaign: 'weekly_digest' },
  { source: null, medium: null, campaign: null },
] as const

export interface HarborTrafficOptions {
  /** Default ~1800ms */
  intervalMs?: number
  writeKey?: string
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function makeLiveEvent(seq: number): AnalyticsEvent {
  const page = pick(PATHS)
  const campaign = pick(CAMPAIGNS)
  const anonymousId = pick(ANONS)
  const userId = pick(USERS)
  const now = new Date()
  const isTrack = Math.random() > 0.45
  const id = `live_${Date.now().toString(36)}_${seq}`

  const context = {
    app: page.app,
    sessionId: `sess_live_${anonymousId}`,
    locale: 'en-US',
    userAgent: 'HarborTraffic/1.0',
    page: {
      url: `https://harbor.demo${page.path}${page.hash ?? ''}`,
      path: page.path,
      hash: page.hash,
      referrer: null,
      title: page.title,
    },
    campaign: {
      source: campaign.source,
      medium: campaign.medium,
      campaign: campaign.campaign,
      content: null,
      term: null,
      gclid: null,
      fbclid: null,
    },
    screen: { width: 1440, height: 900 },
    viewport: { width: 1200, height: 760 },
  }

  if (isTrack) {
    return {
      id,
      type: 'track',
      event: pick(TRACKS),
      timestamp: now.toISOString(),
      anonymousId,
      userId,
      properties: { path: page.path, ...(page.hash ? { hash: page.hash } : {}) },
      context,
    }
  }

  return {
    id,
    type: 'page',
    event: 'pageview',
    name: page.title,
    timestamp: now.toISOString(),
    anonymousId,
    userId,
    properties: { path: page.path, ...(page.hash ? { hash: page.hash } : {}) },
    context,
  }
}

/**
 * Keeps inserting synthetic Harbor traffic so the demo dashboard stays alive.
 * Returns a stop function.
 */
export function startHarborTraffic(store: AnalyticsStore, options: HarborTrafficOptions = {}): () => void {
  const intervalMs = options.intervalMs ?? 1800
  const writeKey = options.writeKey ?? 'live'
  let seq = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const tick = async (): Promise<void> => {
    if (stopped) return
    const batch = [makeLiveEvent(++seq)]
    if (Math.random() > 0.7) batch.push(makeLiveEvent(++seq))
    const meta: IngestMeta = {
      sentAt: new Date().toISOString(),
      writeKey,
      sdk: SDK,
      receivedAt: new Date().toISOString(),
    }
    await store.insert(batch, meta)
    const jitter = Math.floor(intervalMs * (0.65 + Math.random() * 0.7))
    timer = setTimeout(() => {
      void tick()
    }, jitter)
  }

  timer = setTimeout(() => {
    void tick()
  }, 600)

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
    timer = null
  }
}
