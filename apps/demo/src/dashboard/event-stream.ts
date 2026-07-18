import { LitElement, css, html, nothing } from 'lit'
import { repeat } from 'lit/directives/repeat.js'

export interface FeedEvent {
  id: string
  type: string
  event?: string
  name?: string
  timestamp: string
  anonymousId: string
  userId: string | null
  app: string | null
  path: string | null
  campaign: string | null
}

export class EventStream extends LitElement {
  static properties = {
    heading: { type: String },
    events: { attribute: false },
  }

  declare heading: string
  declare events: FeedEvent[]

  constructor() {
    super()
    this.heading = 'Live feed'
    this.events = []
  }

  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      padding: 1.1rem 0 0.5rem;
    }
    h2 {
      margin: 0 0 0.85rem;
      padding: 0 1.05rem;
      font-family: var(--font-display);
      font-size: 1.25rem;
      letter-spacing: -0.03em;
      font-weight: 600;
    }
    .empty {
      padding: 0 1.05rem 1rem;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .item {
      display: grid;
      grid-template-columns: 5.5rem 1fr;
      gap: 0.75rem;
      padding: 0.7rem 1.05rem;
      border-top: 1px solid color-mix(in oklab, var(--line) 75%, transparent);
      animation: in 280ms ease both;
    }
    .time {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--muted);
      padding-top: 0.2rem;
    }
    .title {
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: -0.01em;
    }
    .sub {
      margin-top: 0.2rem;
      color: var(--muted);
      font-size: 0.8rem;
      font-family: var(--font-mono);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pill {
      display: inline-block;
      margin-right: 0.4rem;
      padding: 0.1rem 0.35rem;
      border: 1px solid var(--line);
      color: var(--accent);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `

  render() {
    const rows = this.events.slice(0, 24)
    return html`
      <section class="wrap">
        <h2>${this.heading}</h2>
        ${rows.length === 0 ? html`<div class="empty">Waiting for events…</div>` : nothing}
        ${repeat(
          rows,
          (e) => e.id,
          (e) => html`
            <article class="item">
              <div class="time">${formatTime(e.timestamp)}</div>
              <div>
                <div class="title">
                  <span class="pill">${e.type}</span>
                  ${e.event ?? e.name ?? 'event'}
                </div>
                <div class="sub">
                  ${e.app ?? '—'} · ${e.path ?? '—'}
                  ${e.userId ? html` · user ${shortId(e.userId)}` : html` · anon ${shortId(e.anonymousId)}`}
                  ${e.campaign ? html` · ${e.campaign}` : nothing}
                </div>
              </div>
            </article>
          `,
        )}
      </section>
    `
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function shortId(id: string): string {
  return id.length <= 10 ? id : `${id.slice(0, 6)}…`
}

customElements.define('event-stream', EventStream)

declare global {
  interface HTMLElementTagNameMap {
    'event-stream': EventStream
  }
}
