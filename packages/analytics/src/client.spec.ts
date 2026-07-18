import { createAnalytics } from './client'
import { mergeFirstTouchCampaign, parseCampaignFromSearch } from './campaign'
import { type IngestPayload, isIngestPayload } from './types'

function bodyOf(init?: RequestInit): IngestPayload {
  const raw = init?.body
  if (typeof raw !== 'string') {
    throw new Error('expected string body')
  }
  return JSON.parse(raw) as IngestPayload
}

function mockFetchOk() {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchMock = async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push({ url, init })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

describe('parseCampaignFromSearch', () => {
  it('parses utm params', () => {
    expect(parseCampaignFromSearch('?utm_source=google&utm_medium=cpc&utm_campaign=spring')).toEqual({
      source: 'google',
      medium: 'cpc',
      campaign: 'spring',
      content: null,
      term: null,
    })
  })
})

describe('mergeFirstTouchCampaign', () => {
  it('keeps first touch', () => {
    const first = {
      source: 'google',
      medium: 'cpc',
      campaign: 'spring',
      content: null,
      term: null,
    }
    const second = {
      source: 'newsletter',
      medium: 'email',
      campaign: 'launch',
      content: null,
      term: null,
    }
    expect(mergeFirstTouchCampaign(first, second)).toEqual(first)
  })
})

describe('createAnalytics', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires endpoint', () => {
    expect(() => createAnalytics({ endpoint: '' })).toThrow(/endpoint/)
  })

  it('captures track events and flushes to endpoint', async () => {
    const calls = mockFetchOk()
    const analytics = createAnalytics({
      endpoint: '/ingest',
      app: 'app',
      capturePageviews: false,
      flushAt: 1,
      flushInterval: 0,
      persist: false,
    })

    analytics.capture('cta_clicked', { location: 'hero' })
    await analytics.flush()

    expect(calls.length).toBeGreaterThanOrEqual(1)
    const body = bodyOf(calls[0]?.init)
    expect(isIngestPayload(body)).toBe(true)
    expect(body.batch).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'track',
          event: 'cta_clicked',
          properties: { location: 'hero' },
        }),
      ]),
    )
  })

  it('records pageviews with path', async () => {
    const calls = mockFetchOk()
    window.history.pushState({}, '', '/pricing')
    const analytics = createAnalytics({
      endpoint: '/ingest',
      capturePageviews: true,
      flushAt: 1,
      flushInterval: 0,
      persist: false,
    })

    await analytics.flush()
    const body = bodyOf(calls[0]?.init)
    const page = body.batch.find((e) => e.type === 'page')
    expect(page).toBeTruthy()
    expect(page?.event).toBe('pageview')
    expect(page?.properties.path).toBe('/pricing')
  })

  it('stores first-touch campaign from URL', async () => {
    const calls = mockFetchOk()
    window.history.pushState({}, '', '/?utm_source=twitter&utm_medium=social&utm_campaign=launch')
    const analytics = createAnalytics({
      endpoint: '/ingest',
      capturePageviews: false,
      flushAt: 1,
      flushInterval: 0,
      persist: true,
    })

    analytics.capture('signup_started')
    await analytics.flush()

    const body = bodyOf(calls[0]?.init)
    expect(body.batch[0]?.context.campaign).toEqual({
      source: 'twitter',
      medium: 'social',
      campaign: 'launch',
      content: null,
      term: null,
    })

    window.history.pushState({}, '', '/?utm_source=other')
    analytics.capture('signup_completed')
    await analytics.flush()
    const body2 = bodyOf(calls[1]?.init)
    expect(body2.batch[0]?.context.campaign.source).toBe('twitter')
  })

  it('identify sets userId on subsequent events', async () => {
    const calls = mockFetchOk()
    const analytics = createAnalytics({
      endpoint: '/ingest',
      capturePageviews: false,
      flushAt: 10,
      flushInterval: 0,
      persist: false,
    })

    analytics.identify('user_1', { plan: 'pro' })
    analytics.capture('feature_used')
    await analytics.flush()

    const body = bodyOf(calls[0]?.init)
    const identify = body.batch.find((e) => e.type === 'identify')
    const track = body.batch.find((e) => e.event === 'feature_used')
    expect(identify?.userId).toBe('user_1')
    expect(identify?.properties.plan).toBe('pro')
    expect(track?.userId).toBe('user_1')
  })

  it('optOut prevents sending', async () => {
    const calls = mockFetchOk()
    const analytics = createAnalytics({
      endpoint: '/ingest',
      capturePageviews: false,
      flushAt: 1,
      flushInterval: 0,
      persist: false,
    })

    analytics.optOut()
    analytics.capture('should_not_send')
    await analytics.flush()
    expect(calls.length).toBe(0)
  })

  it('reset clears user and rotates anonymous id', () => {
    const analytics = createAnalytics({
      endpoint: '/ingest',
      capturePageviews: false,
      flushInterval: 0,
      persist: false,
    })
    analytics.identify('user_1')
    const before = analytics.getAnonymousId()
    analytics.reset()
    expect(analytics.getUserId()).toBeNull()
    expect(analytics.getAnonymousId()).not.toBe(before)
  })
})
