import { createAnalytics } from './client'
import { mergeFirstTouchCampaign, parseCampaignFromSearch } from './campaign'
import { type IngestPayload, isIngestPayload, parseIngestPayload } from './types'

function bodyOf(init?: RequestInit): IngestPayload {
  const raw = init?.body
  if (typeof raw !== 'string') throw new Error('expected string body')
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
  it('parses utm + click ids', () => {
    expect(parseCampaignFromSearch('?utm_source=google&utm_medium=cpc&utm_campaign=spring&gclid=abc')).toEqual({
      source: 'google',
      medium: 'cpc',
      campaign: 'spring',
      content: null,
      term: null,
      gclid: 'abc',
      fbclid: null,
    })
  })
})

describe('mergeFirstTouchCampaign', () => {
  it('keeps first touch', () => {
    const first = parseCampaignFromSearch('?utm_source=google&utm_medium=cpc&utm_campaign=spring')
    const second = parseCampaignFromSearch('?utm_source=newsletter&utm_medium=email&utm_campaign=launch')
    expect(mergeFirstTouchCampaign(first, second)).toEqual(first)
  })
})

describe('parseIngestPayload', () => {
  it('rejects shallow garbage', () => {
    expect(parseIngestPayload({ schemaVersion: 1, sentAt: 'x', sdk: {}, batch: [{}] }).ok).toBe(false)
  })
})

describe('createAnalytics', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.unstubAllGlobals()
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requires endpoint', () => {
    expect(() => createAnalytics({ endpoint: '' })).toThrow(/endpoint/)
  })

  it('captures track events and flushes', async () => {
    const calls = mockFetchOk()
    const analytics = createAnalytics({
      endpoint: '/ingest',
      app: 'app',
      capturePageviews: false,
      flushAt: 1,
      flushInterval: 0,
      persist: false,
    })

    analytics.track('cta_clicked', { location: 'hero' })
    await analytics.flush()

    const body = bodyOf(calls[0]?.init)
    expect(isIngestPayload(body)).toBe(true)
    expect(body.batch[0]?.context.sessionId).toBeTruthy()
    expect(body.batch).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'track',
          event: 'cta_clicked',
          properties: { location: 'hero' },
        }),
      ]),
    )
    analytics.destroy()
  })

  it('auto pageviews on hash / history navigation', async () => {
    const calls = mockFetchOk()
    const analytics = createAnalytics({
      endpoint: '/ingest',
      capturePageviews: 'history',
      flushAt: 20,
      flushInterval: 0,
      persist: false,
    })

    await analytics.flush()
    const afterInit = calls.length
    expect(afterInit).toBeGreaterThanOrEqual(1)

    window.location.hash = '#/pricing'
    window.dispatchEvent(new Event('hashchange'))
    await Promise.resolve()
    await analytics.flush()

    expect(calls.length).toBeGreaterThan(afterInit)
    const body = bodyOf(calls[calls.length - 1]?.init)
    const pages = body.batch.filter((e) => e.type === 'page')
    expect(pages.some((p) => typeof p.properties.hash === 'string' && p.properties.hash.includes('pricing'))).toBe(
      true,
    )
    analytics.destroy()
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
    expect(bodyOf(calls[0]?.init).batch[0]?.context.campaign.source).toBe('twitter')

    window.history.pushState({}, '', '/?utm_source=other')
    analytics.capture('signup_completed')
    await analytics.flush()
    expect(bodyOf(calls[1]?.init).batch[0]?.context.campaign.source).toBe('twitter')
    analytics.destroy()
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
    expect(body.batch.find((e) => e.type === 'identify')?.userId).toBe('user_1')
    expect(body.batch.find((e) => e.event === 'feature_used')?.userId).toBe('user_1')
    analytics.destroy()
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
    analytics.destroy()
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
    analytics.destroy()
  })
})
