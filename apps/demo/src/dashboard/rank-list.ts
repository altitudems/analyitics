import { LitElement, css, html, nothing } from 'lit'
import { repeat } from 'lit/directives/repeat.js'

export interface RankItem {
  key: string
  label: string
  value: number
}

export class RankList extends LitElement {
  static properties = {
    heading: { type: String },
    items: { attribute: false },
  }

  declare heading: string
  declare items: RankItem[]

  constructor() {
    super()
    this.heading = ''
    this.items = []
  }

  static styles = css`
    :host {
      display: block;
    }
    .wrap {
      padding: 1.1rem 0 0.25rem;
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
    .row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.75rem;
      align-items: center;
      padding: 0.55rem 1.05rem;
    }
    .label {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 7rem;
      justify-content: flex-end;
    }
    .bar {
      width: 4.5rem;
      height: 4px;
      background: color-mix(in oklab, var(--line) 70%, transparent);
      overflow: hidden;
    }
    .bar > span {
      display: block;
      height: 100%;
      background: var(--accent);
      transform-origin: left center;
    }
    .count {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      font-size: 0.9rem;
      min-width: 1.75rem;
      text-align: right;
    }
  `

  render() {
    const max = Math.max(1, ...this.items.map((i) => i.value))
    return html`
      <section class="wrap">
        <h2>${this.heading}</h2>
        ${this.items.length === 0
          ? html`<div class="empty">Nothing yet — browse the marketing site and app.</div>`
          : nothing}
        ${repeat(
          this.items.slice(0, 8),
          (i) => i.key,
          (i) => html`
            <div class="row">
              <div class="label" title=${i.label}>${i.label}</div>
              <div class="meta">
                <div class="bar"><span style="width:${(i.value / max) * 100}%"></span></div>
                <div class="count">${i.value}</div>
              </div>
            </div>
          `,
        )}
      </section>
    `
  }
}

customElements.define('rank-list', RankList)

declare global {
  interface HTMLElementTagNameMap {
    'rank-list': RankList
  }
}
