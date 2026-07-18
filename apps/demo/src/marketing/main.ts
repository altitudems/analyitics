import { createAnalytics } from '@altitudems/analytics'
import './styles.css'

const analytics = createAnalytics({
  endpoint: '/ingest',
  writeKey: 'dev-write-key',
  app: 'marketing',
  debug: true,
})

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('#app missing')

root.innerHTML = `
  <header class="hero">
    <div class="hero-media" aria-hidden="true"></div>
    <div class="hero-grain" aria-hidden="true"></div>
    <nav class="nav">
      <span aria-hidden="true"></span>
      <div class="nav-links">
        <a href="/dashboard.html">Dashboard</a>
        <a href="/app.html">Open app</a>
      </div>
    </nav>
    <h1 class="hero-brand">Harbor</h1>
    <div class="hero-foot">
      <p>Release calendars without the noise. One calm place for owners, dates, and what’s shipping next.</p>
      <div class="cta-row">
        <a class="btn btn-primary" data-cta="hero_primary" href="/app.html">Start free</a>
        <button class="btn btn-ghost" type="button" data-cta="hero_secondary">See how it works</button>
      </div>
      <div class="live" id="live">Events received · <strong>—</strong></div>
    </div>
  </header>
  <section class="section" id="how">
    <h2>Launches should feel quiet.</h2>
    <p>This page and the app share one first-party analytics pipe — same anonymous id, same ingest, your store.</p>
  </section>
`

async function tickLive(): Promise<void> {
  const el = document.querySelector('#live strong')
  if (!el) return
  try {
    const res = await fetch('/stats')
    const data = (await res.json()) as { totalEvents: number }
    el.textContent = String(data.totalEvents)
  } catch {
    el.textContent = 'offline'
  }
}

root.querySelectorAll<HTMLElement>('[data-cta]').forEach((el) => {
  el.addEventListener('click', () => {
    const id = el.dataset.cta ?? 'unknown'
    analytics.capture('cta_clicked', { location: id })
    if (id === 'hero_secondary') {
      document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' })
    }
    void analytics.flush().then(tickLive)
  })
})

void analytics.flush().then(tickLive)
setInterval(() => {
  void tickLive()
}, 3000)
