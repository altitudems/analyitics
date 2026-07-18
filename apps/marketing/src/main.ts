import { createAnalytics } from '@altitudems/analytics'
import './styles.css'

const INGEST = import.meta.env.VITE_ANALYTICS_ENDPOINT ?? 'http://localhost:8787/ingest'
const WRITE_KEY = import.meta.env.VITE_ANALYTICS_WRITE_KEY ?? 'dev-write-key'
const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:5174'

const analytics = createAnalytics({
  endpoint: INGEST,
  writeKey: WRITE_KEY,
  app: 'marketing',
})

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('#app missing')

root.innerHTML = `
  <header class="hero">
    <nav class="nav">
      <div class="brand">Harbor</div>
      <a class="nav-link" href="${APP_URL}">Open app</a>
    </nav>
    <div class="hero-copy">
      <h1>Ship quieter.</h1>
      <p>Harbor keeps product launches calm — one place for timelines, owners, and the next release.</p>
      <div class="cta-row">
        <a class="btn btn-primary" data-cta="hero_primary" href="${APP_URL}/?utm_source=marketing&utm_medium=cta&utm_campaign=hero">
          Start free
        </a>
        <button class="btn btn-ghost" type="button" data-cta="hero_secondary">See how it works</button>
      </div>
    </div>
  </header>
  <section class="section" id="how">
    <h2>Built for teams who hate launch chaos.</h2>
    <p>This marketing page is an example consumer of @altitudems/analytics — pageviews and CTA clicks flow to your first-party ingest.</p>
  </section>
`

root.querySelectorAll<HTMLElement>('[data-cta]').forEach((el) => {
  el.addEventListener('click', () => {
    const id = el.dataset.cta ?? 'unknown'
    analytics.capture('cta_clicked', { location: id, app: 'marketing' })
    if (id === 'hero_secondary') {
      document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })
    }
  })
})
