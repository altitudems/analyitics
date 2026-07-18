import { LitElement, css, html, nothing } from 'lit'

export class StatTile extends LitElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    hint: { type: String },
  }

  declare label: string
  declare value: string
  declare hint: string

  constructor() {
    super()
    this.label = ''
    this.value = '—'
    this.hint = ''
  }

  static styles = css`
    :host {
      display: block;
    }
    .tile {
      padding: 1rem 1.05rem 1.05rem;
      border-bottom: 1px solid color-mix(in oklab, var(--line) 80%, transparent);
    }
    .label {
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .value {
      margin-top: 0.45rem;
      font-family: var(--font-display);
      font-size: clamp(1.85rem, 3vw, 2.35rem);
      letter-spacing: -0.04em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .hint {
      margin-top: 0.45rem;
      color: var(--muted);
      font-size: 0.82rem;
    }
  `

  render() {
    return html`
      <div class="tile">
        <div class="label">${this.label}</div>
        <div class="value">${this.value}</div>
        ${this.hint ? html`<div class="hint">${this.hint}</div>` : nothing}
      </div>
    `
  }
}

customElements.define('stat-tile', StatTile)

declare global {
  interface HTMLElementTagNameMap {
    'stat-tile': StatTile
  }
}
