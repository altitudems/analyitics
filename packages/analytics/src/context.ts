import type { Campaign, EventContext } from './types'

export function getPageContext(campaign: Campaign, app: string | null): EventContext {
  const hasWindow = typeof window !== 'undefined'
  const hasDocument = typeof document !== 'undefined'

  return {
    app,
    locale: hasWindow ? (window.navigator.language ?? null) : null,
    userAgent: hasWindow ? (window.navigator.userAgent ?? null) : null,
    page: {
      url: hasWindow ? window.location.href : null,
      path: hasWindow ? window.location.pathname : null,
      referrer: hasDocument ? document.referrer || null : null,
      title: hasDocument ? document.title || null : null,
    },
    campaign,
    screen: {
      width: hasWindow ? window.innerWidth : null,
      height: hasWindow ? window.innerHeight : null,
    },
  }
}
