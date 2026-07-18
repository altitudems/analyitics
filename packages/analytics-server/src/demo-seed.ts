import type { AnalyticsEvent, Campaign, EventContext } from '@altitudems/analytics'
import type { AnalyticsStore, IngestMeta } from './store'

const SDK = { name: '@altitudems/analytics', version: '2.1.0' } as const

interface SeedVisitor {
  anonymousId: string
  userId: string | null
  sessionId: string
}

interface CampaignSpec {
  source: string | null
  medium: string | null
  campaign: string | null
  gclid?: string | null
  fbclid?: string | null
}

const VISITORS: SeedVisitor[] = [
  { anonymousId: 'anon_mira', userId: 'user_mira', sessionId: 'sess_mira' },
  { anonymousId: 'anon_alex', userId: 'user_alex', sessionId: 'sess_alex' },
  { anonymousId: 'anon_jordan', userId: 'user_jordan', sessionId: 'sess_jordan' },
  { anonymousId: 'anon_sam', userId: null, sessionId: 'sess_sam' },
  { anonymousId: 'anon_rio', userId: null, sessionId: 'sess_rio' },
  { anonymousId: 'anon_kai', userId: 'user_kai', sessionId: 'sess_kai' },
  { anonymousId: 'anon_lee', userId: null, sessionId: 'sess_lee' },
  { anonymousId: 'anon_nova', userId: 'user_nova', sessionId: 'sess_nova' },
]

const CAMPAIGNS: CampaignSpec[] = [
  { source: 'twitter', medium: 'social', campaign: 'launch' },
  { source: 'google', medium: 'cpc', campaign: 'spring_releases', gclid: 'seed_gclid' },
  { source: 'newsletter', medium: 'email', campaign: 'weekly_digest' },
  { source: 'linkedin', medium: 'social', campaign: 'founder_thread' },
  { source: null, medium: null, campaign: null },
]

const PAGES: Array<{ app: string; path: string; hash: string | null; title: string }> = [
  { app: 'marketing', path: '/', hash: null, title: 'Harbor' },
  { app: 'marketing', path: '/pricing', hash: null, title: 'Pricing · Harbor' },
  { app: 'marketing', path: '/blog/launch', hash: null, title: 'Launch week' },
  { app: 'app', path: '/app.html', hash: '#/releases', title: 'Releases · Harbor' },
  { app: 'app', path: '/app.html', hash: '#/settings', title: 'Settings · Harbor' },
]

const TRACKS = [
  'cta_clicked',
  'signup_started',
  'feature_used',
  'invite_teammate',
  'release_created',
  'theme_toggled',
] as const

function campaignOf(spec: CampaignSpec): Campaign {
  return {
    source: spec.source,
    medium: spec.medium,
    campaign: spec.campaign,
    content: null,
    term: null,
    gclid: spec.gclid ?? null,
    fbclid: spec.fbclid ?? null,
  }
}

function contextOf(visitor: SeedVisitor, page: (typeof PAGES)[number], campaign: Campaign): EventContext {
  const url = `https://harbor.demo${page.path}${page.hash ?? ''}`
  return {
    app: page.app,
    sessionId: visitor.sessionId,
    locale: 'en-US',
    userAgent: 'HarborSeed/1.0',
    page: {
      url,
      path: page.path,
      hash: page.hash,
      referrer: campaign.source ? `https://${campaign.source}.com/` : null,
      title: page.title,
    },
    campaign,
    screen: { width: 1440, height: 900 },
    viewport: { width: 1280, height: 800 },
  }
}

function eventBase(
  id: string,
  visitor: SeedVisitor,
  when: Date,
  page: (typeof PAGES)[number],
  campaign: Campaign,
): Pick<AnalyticsEvent, 'id' | 'timestamp' | 'anonymousId' | 'userId' | 'properties' | 'context'> {
  return {
    id,
    timestamp: when.toISOString(),
    anonymousId: visitor.anonymousId,
    userId: visitor.userId,
    properties: {
      path: page.path,
      ...(page.hash ? { hash: page.hash } : {}),
    },
    context: contextOf(visitor, page, campaign),
  }
}

/** Build a busy Harbor-looking history for local demos. */
export function buildHarborSeedEvents(now = new Date()): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = []
  let n = 0
  const hours = 6

  for (let i = 0; i < 96; i++) {
    const minutesAgo = Math.floor((i / 96) * hours * 60)
    const when = new Date(now.getTime() - minutesAgo * 60_000 - (i % 7) * 1_700)
    const visitor = VISITORS[i % VISITORS.length]!
    const page = PAGES[i % PAGES.length]!
    const campaign = campaignOf(CAMPAIGNS[i % CAMPAIGNS.length]!)
    const base = eventBase(`seed_${++n}`, visitor, when, page, campaign)

    events.push({
      ...base,
      type: 'page',
      event: 'pageview',
      name: page.title,
    })

    if (i % 3 === 0) {
      const track = TRACKS[i % TRACKS.length]!
      events.push({
        ...eventBase(`seed_${++n}`, visitor, new Date(when.getTime() + 800), page, campaign),
        type: 'track',
        event: track,
        properties: {
          ...base.properties,
          cta: track === 'cta_clicked' ? 'hero_primary' : undefined,
        },
      })
    }

    if (i % 11 === 0 && visitor.userId) {
      events.push({
        ...eventBase(`seed_${++n}`, visitor, new Date(when.getTime() + 400), page, campaign),
        type: 'identify',
        name: 'identify',
        properties: { plan: i % 2 === 0 ? 'team' : 'solo' },
      })
    }
  }

  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function seedHarborDemo(store: AnalyticsStore, now = new Date()): Promise<number> {
  const batch = buildHarborSeedEvents(now)
  const meta: IngestMeta = {
    sentAt: now.toISOString(),
    writeKey: 'seed',
    sdk: SDK,
    receivedAt: now.toISOString(),
  }
  await store.insert(batch, meta)
  return batch.length
}
