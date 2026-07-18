import { createAnalytics } from '@altitudems/analytics'
import './styles.css'

const analytics = createAnalytics({
  endpoint: '/ingest',
  writeKey: 'dev-write-key',
  app: 'app',
  capturePageviews: 'history',
  debug: true,
})

type Route = 'releases' | 'settings'

function routeFromHash(): Route {
  const h = location.hash.replace(/^#\/?/, '')
  return h === 'settings' ? 'settings' : 'releases'
}

function navigate(route: Route): void {
  history.pushState({}, '', `/app.html#/${route}`)
  render()
}

const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('#app missing')

async function refreshStats(): Promise<void> {
  await analytics.flush()
  const el = document.querySelector('#stats')
  if (!el) return
  try {
    const res = await fetch('/stats')
    const data = (await res.json()) as {
      pageviews: number
      uniqueAnonymous: number
      totalEvents: number
      tracks: number
      identifiedUsers: number
      topPages: Array<{ path: string; views: number }>
      topEvents: Array<{ event: string; count: number }>
    }
    const top = data.topPages[0]
    const topEvent = data.topEvents[0]
    el.innerHTML = `
      <div class="stat"><span>Total events</span><strong>${data.totalEvents}</strong></div>
      <div class="stat"><span>Pageviews</span><strong>${data.pageviews}</strong></div>
      <div class="stat"><span>Tracks</span><strong>${data.tracks}</strong></div>
      <div class="stat"><span>Uniques</span><strong>${data.uniqueAnonymous}</strong></div>
      <div class="stat"><span>Identified</span><strong>${data.identifiedUsers}</strong></div>
      <div class="stat"><span>Top page</span><strong>${top ? top.path : '—'}</strong></div>
      <div class="stat"><span>Top event</span><strong>${topEvent ? topEvent.event : '—'}</strong></div>
    `
  } catch {
    el.innerHTML = `<div class="stat"><span>Stats</span><strong>API offline</strong></div>`
  }
}

function render(): void {
  const route = routeFromHash()
  const userId = analytics.getUserId()
  const signedIn = Boolean(userId)

  const body =
    route === 'settings'
      ? `
        <section class="panel">
          <h1>Settings</h1>
          <p>SPA pageviews fire on hash changes — watch pageview counts climb without a reload.</p>
          <div class="actions">
            <button type="button" data-action="save_settings">Save preferences</button>
          </div>
        </section>
      `
      : `
        <section class="panel">
          <h1>Release board</h1>
          <p>Same anonymous id as the marketing site. Sign in to stitch the funnel.</p>
          <div class="identity">
            <div>Anonymous · <code>${analytics.getAnonymousId()}</code></div>
            <div>Session · <code>${analytics.getSessionId()}</code></div>
            <div>User · <code>${userId ?? 'signed out'}</code></div>
          </div>
          <div class="actions">
            ${
              signedIn
                ? `<button class="danger" type="button" data-action="logout">Sign out</button>`
                : `<button type="button" data-action="login">Sign in as Alex</button>`
            }
            <button type="button" data-action="create_release">Create release</button>
            <button class="secondary" type="button" data-action="invite_teammate">Invite teammate</button>
            <button class="secondary" type="button" data-action="refresh_stats">Refresh stats</button>
          </div>
        </section>
      `

  root!.innerHTML = `
    <div class="shell">
      <header class="top">
        <div class="brand">Harbor</div>
        <div class="top-meta">
          <a href="/">Marketing</a>
          <span>·</span>
          <span>Demo app</span>
        </div>
      </header>
      <nav class="nav">
        <a href="#/releases" data-nav="releases" ${route === 'releases' ? 'aria-current="page"' : ''}>Releases</a>
        <a href="#/settings" data-nav="settings" ${route === 'settings' ? 'aria-current="page"' : ''}>Settings</a>
      </nav>
      ${body}
      <section class="stats" id="stats">
        <div class="stat"><span>Loading</span><strong>…</strong></div>
      </section>
    </div>
  `

  root!.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      navigate(a.dataset.nav as Route)
    })
  })

  root!.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action ?? 'unknown'
      if (action === 'refresh_stats') {
        void refreshStats()
        return
      }
      if (action === 'login') {
        analytics.identify('user_demo_42', { name: 'Alex Rivera', plan: 'pro' })
        render()
        void refreshStats()
        return
      }
      if (action === 'logout') {
        analytics.capture('signed_out')
        analytics.reset()
        render()
        void refreshStats()
        return
      }
      analytics.capture(action, { source: 'app_shell', route })
      void refreshStats()
    })
  })

  void refreshStats()
}

window.addEventListener('popstate', () => render())
if (!location.hash) history.replaceState({}, '', '/app.html#/releases')
render()
