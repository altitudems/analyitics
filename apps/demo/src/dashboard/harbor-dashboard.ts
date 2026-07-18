import { LitElement, css, html } from 'lit'
import type { AnalyticsStats, StoredEvent } from '@altitudems/analytics-server'
import './stat-tile'
import './rank-list'
import './event-stream'
import type { FeedEvent } from './event-stream'
import type { RankItem } from './rank-list'

interface StreamSnapshot {
  stats: AnalyticsStats
  events: StoredEvent[]
}

interface StreamBatch {
  events: StoredEvent[]
  stats: AnalyticsStats
}

export class HarborDashboard extends LitElement {
  static properties = {
    stats: { attribute: false },
    events: { attribute: false },
    freshIds: { attribute: false },
    status: { type: String },
    transport: { type: String },
    updatedAt: { type: String },
  }

  declare stats: AnalyticsStats | null
  declare events: StoredEvent[]
  declare freshIds: Set<string>
  declare status: 'loading' | 'live' | 'offline'
  declare transport: 'sse' | 'poll' | ''
  declare updatedAt: string

  #source: EventSource | null = null
  #pollTimer: ReturnType<typeof setInterval> | null = null
  #freshTimer: ReturnType<typeof setTimeout> | null = null
  #seen = new Set<string>()

  constructor() {
    super()
    this.stats = null
    this.events = []
    this.freshIds = new Set()
    this.status = 'loading'
    this.transport = ''
    this.updatedAt = ''
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.#connectSse()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.#teardown()
  }

  #teardown(): void {
    this.#source?.close()
    this.#source = null
    if (this.#pollTimer) clearInterval(this.#pollTimer)
    this.#pollTimer = null
    if (this.#freshTimer) clearTimeout(this.#freshTimer)
    this.#freshTimer = null
  }

  #markLive(transport: 'sse' | 'poll'): void {
    this.status = 'live'
    this.transport = transport
    this.updatedAt = new Date().toLocaleTimeString()
  }

  #applySnapshot(payload: StreamSnapshot): void {
    this.stats = payload.stats
    const newestFirst = [...payload.events].reverse()
    this.events = newestFirst
    this.#seen = new Set(newestFirst.map((e) => e.id))
    this.#markLive('sse')
  }

  #applyBatch(payload: StreamBatch): void {
    this.stats = payload.stats
    const incoming = [...payload.events].reverse()
    const fresh = new Set<string>()
    const next = [...this.events]
    for (const event of incoming) {
      if (this.#seen.has(event.id)) continue
      this.#seen.add(event.id)
      fresh.add(event.id)
      next.unshift(event)
    }
    this.events = next.slice(0, 160)
    if (fresh.size > 0) {
      this.freshIds = fresh
      if (this.#freshTimer) clearTimeout(this.#freshTimer)
      this.#freshTimer = setTimeout(() => {
        this.freshIds = new Set()
      }, 1400)
    }
    this.#markLive('sse')
  }

  #connectSse(): void {
    this.#teardown()
    if (typeof EventSource === 'undefined') {
      void this.#startPolling()
      return
    }

    const source = new EventSource('/stream')
    this.#source = source

    source.addEventListener('snapshot', (ev) => {
      try {
        this.#applySnapshot(JSON.parse((ev as MessageEvent).data) as StreamSnapshot)
      } catch {
        this.status = 'offline'
      }
    })

    source.addEventListener('batch', (ev) => {
      try {
        this.#applyBatch(JSON.parse((ev as MessageEvent).data) as StreamBatch)
      } catch {
        // ignore malformed
      }
    })

    source.onerror = () => {
      source.close()
      this.#source = null
      void this.#startPolling()
    }
  }

  async #startPolling(): Promise<void> {
    if (this.#pollTimer) return
    const pull = async () => {
      try {
        const [statsRes, eventsRes] = await Promise.all([fetch('/stats'), fetch('/events')])
        if (!statsRes.ok || !eventsRes.ok) throw new Error('bad response')
        this.stats = (await statsRes.json()) as AnalyticsStats
        const payload = (await eventsRes.json()) as { events: StoredEvent[] }
        const newestFirst = [...payload.events].reverse()
        const fresh = new Set<string>()
        for (const event of newestFirst) {
          if (this.#seen.size > 0 && !this.#seen.has(event.id)) fresh.add(event.id)
          this.#seen.add(event.id)
        }
        this.events = newestFirst.slice(0, 160)
        if (fresh.size > 0) {
          this.freshIds = fresh
          if (this.#freshTimer) clearTimeout(this.#freshTimer)
          this.#freshTimer = setTimeout(() => {
            this.freshIds = new Set()
          }, 1400)
        }
        this.#markLive('poll')
      } catch {
        this.status = 'offline'
        this.transport = ''
      }
    }
    await pull()
    this.#pollTimer = setInterval(() => {
      void pull()
    }, 2000)
  }

  static styles = css`
    :host {
      --ink: #070b0e;
      --panel: #10161c;
      --line: #24303a;
      --text: #e8eef4;
      --muted: #8b98a6;
      --accent: #d6f35c;
      --font-display: 'Fraunces', Georgia, serif;
      --font-body: 'Manrope', system-ui, sans-serif;
      --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
      display: block;
      min-height: 100svh;
      color: var(--text);
      background:
        radial-gradient(900px 420px at 100% -10%, rgba(214, 243, 92, 0.08), transparent 55%),
        linear-gradient(180deg, #070b0e 0%, #0b1116 100%);
      font-family: var(--font-body);
    }

    .shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 1.25rem clamp(1rem, 3vw, 2rem) 2.5rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 1rem;
      margin-bottom: 1.5rem;
      animation: rise 450ms ease both;
    }

    .brand {
      font-family: var(--font-display);
      font-size: clamp(2.4rem, 6vw, 3.6rem);
      letter-spacing: -0.045em;
      line-height: 0.92;
      margin: 0;
    }

    .sub {
      margin: 0.45rem 0 0;
      color: var(--muted);
      font-size: 0.95rem;
    }

    .aside {
      text-align: right;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .aside a {
      color: var(--text);
      font-weight: 600;
      text-decoration: none;
      margin-left: 0.75rem;
    }

    .dot {
      display: inline-block;
      width: 0.5rem;
      height: 0.5rem;
      margin-right: 0.4rem;
      border-radius: 50%;
      background: var(--muted);
    }

    .dot[data-on='live'] {
      background: var(--accent);
      box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 20%, transparent);
      animation: pulse 1.6s ease infinite;
    }

    .grid {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 1rem;
      animation: rise 650ms ease both;
    }

    .panel {
      background: color-mix(in oklab, var(--panel) 92%, black);
      border: 1px solid var(--line);
      border-radius: 2px;
      overflow: hidden;
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .span {
      grid-column: 1 / -1;
    }

    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .tiles {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      header {
        flex-direction: column;
        align-items: start;
      }
      .aside {
        text-align: left;
      }
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    @keyframes pulse {
      0%,
      100% {
        box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 18%, transparent);
      }
      50% {
        box-shadow: 0 0 0 7px color-mix(in oklab, var(--accent) 8%, transparent);
      }
    }
  `

  render() {
    const s = this.stats
    const pages: RankItem[] = s?.topPages.map((p) => ({ key: p.path, label: p.path, value: p.views })) ?? []
    const events: RankItem[] = s?.topEvents.map((e) => ({ key: e.event, label: e.event, value: e.count })) ?? []
    const campaigns: RankItem[] =
      s?.campaigns.map((c) => ({
        key: `${c.source}-${c.medium}-${c.campaign}`,
        label: `${c.source} / ${c.medium} / ${c.campaign}`,
        value: c.events,
      })) ?? []

    const feed: FeedEvent[] = this.events.map((e) => ({
      id: e.id,
      type: e.type,
      event: e.event,
      name: e.name,
      timestamp: e.timestamp,
      anonymousId: e.anonymousId,
      userId: e.userId,
      app: e.context.app,
      path: typeof e.properties.path === 'string' ? e.properties.path : e.context.page.path,
      campaign: e.context.campaign.campaign || e.context.campaign.source,
      fresh: this.freshIds.has(e.id),
    }))

    const statusLabel =
      this.status === 'live'
        ? `${this.transport === 'sse' ? 'SSE' : 'Polling'} · ${this.updatedAt}`
        : this.status === 'loading'
          ? 'Connecting…'
          : 'API offline'

    return html`
      <div class="shell">
        <header>
          <div>
            <h1 class="brand">Harbor</h1>
            <p class="sub">Live analytics · seeded history + realtime stream</p>
          </div>
          <div class="aside">
            <div>
              <span class="dot" data-on=${this.status}></span>
              ${statusLabel}
            </div>
            <div>
              <a href="/">Marketing</a>
              <a href="/app.html">App</a>
            </div>
          </div>
        </header>

        <div class="grid">
          <div class="panel span">
            <div class="tiles">
              <stat-tile label="Events" value=${String(s?.totalEvents ?? '—')}></stat-tile>
              <stat-tile label="Pageviews" value=${String(s?.pageviews ?? '—')}></stat-tile>
              <stat-tile label="Tracks" value=${String(s?.tracks ?? '—')}></stat-tile>
              <stat-tile label="Uniques" value=${String(s?.uniqueAnonymous ?? '—')}></stat-tile>
              <stat-tile label="Identified" value=${String(s?.identifiedUsers ?? '—')}></stat-tile>
              <stat-tile
                label="Top event"
                value=${s?.topEvents[0]?.event ?? '—'}
                hint=${s?.topEvents[0] ? `${s.topEvents[0].count} fires` : ''}
              ></stat-tile>
            </div>
          </div>

          <div class="panel">
            <rank-list heading="Top pages" .items=${pages}></rank-list>
            <rank-list heading="Campaigns" .items=${campaigns}></rank-list>
          </div>

          <div class="panel">
            <rank-list heading="Top events" .items=${events}></rank-list>
            <event-stream heading="Live feed" .events=${feed}></event-stream>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('harbor-dashboard', HarborDashboard)

declare global {
  interface HTMLElementTagNameMap {
    'harbor-dashboard': HarborDashboard
  }
}
