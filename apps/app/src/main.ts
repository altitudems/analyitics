import { createAnalytics } from '@altitudems/analytics'
import './styles.css'

const INGEST = import.meta.env.VITE_ANALYTICS_ENDPOINT ?? 'http://localhost:8787/ingest'
const WRITE_KEY = import.meta.env.VITE_ANALYTICS_WRITE_KEY ?? 'dev-write-key'
const STATS_URL = import.meta.env.VITE_ANALYTICS_STATS_URL ?? 'http://localhost:8787/stats'

const analytics = createAnalytics({
  endpoint: INGEST,
  writeKey: WRITE_KEY,
  app: 'app',
})

// Fake signed-in user for the demo
analytics.identify('user_demo_42', { name: 'Alex Rivera', plan: 'pro' })

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('#app missing')

root.innerHTML = `
  <div class="shell">
    <header class="top">
      <div class="brand">Harbor</div>
      <div class="meta">Fake app · demo user</div>
    </header>
    <section class="panel">
      <h1>Release board</h1>
      <p>Product events from this shell hit the same first-party ingest as the marketing site.</p>
      <div class="actions">
        <button type="button" data-action="create_release">Create release</button>
        <button class="secondary" type="button" data-action="invite_teammate">Invite teammate</button>
        <button class="secondary" type="button" data-action="refresh_stats">Refresh stats</button>
      </div>
    </section>
    <section class="stats" id="stats">
      <div class="stat"><span>Loading</span><strong>…</strong></div>
    </section>
  </div>
`

async function refreshStats(): Promise<void> {
  const el = document.querySelector('#stats')
  if (!el) return
  try {
    const res = await fetch(STATS_URL)
    const data = (await res.json()) as {
      pageviews: number
      uniqueAnonymous: number
      totalEvents: number
      topPages: Array<{ path: string; views: number }>
    }
    const top = data.topPages[0]
    el.innerHTML = `
      <div class="stat"><span>Total events</span><strong>${data.totalEvents}</strong></div>
      <div class="stat"><span>Pageviews</span><strong>${data.pageviews}</strong></div>
      <div class="stat"><span>Uniques</span><strong>${data.uniqueAnonymous}</strong></div>
      <div class="stat"><span>Top page</span><strong>${top ? `${top.path} (${top.views})` : '—'}</strong></div>
    `
  } catch {
    el.innerHTML = `<div class="stat"><span>Stats</span><strong>API offline</strong></div>`
  }
}

root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action ?? 'unknown'
    if (action === 'refresh_stats') {
      void refreshStats()
      return
    }
    analytics.capture(action, { source: 'app_shell' })
    void refreshStats()
  })
})

void refreshStats()
