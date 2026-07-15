import { parseUserAgent } from './user-agent'
import { getNetworkMbps } from './utils'

export interface AnalyticsContext {
  networkMbps: number | null
  url: string | null
  referrer: string | null
  domain: string | null
  path: string | null
  unique: boolean

  browser: string | null
  browserVersion: string | null
  os: string | null
  osVersion: string | null
  platform: string | null
  width: number | null
  height: number | null

  /**
   * Think of this as a channel.
   * e.g. Social, Organic, Paid, Email, Affiliates
   */
  utmMedium: string | null
  /**
   * An individual source within a medium.
   */
  utmSource: string | null
  /**
   * The specific campaign that you’re running.
   */
  utmCampaign: string | null
  /**
   * Differentiates multiple links in the same campaign.
   */
  utmContent: string | null
  /**
   * Search term used in relationship to this action or page.
   */
  utmTerm: string | null
}

export function getContext(): AnalyticsContext {
  const parsed = parseUserAgent()
  const params = new URLSearchParams(window.location.search.slice(1))
  const referrer = document.referrer
  const domain = window.location.hostname

  return {
    networkMbps: getNetworkMbps(),
    url: window.location.href,
    referrer,
    domain,
    path: window.location.pathname,
    unique: !referrer.includes(domain),
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    platform: parsed.platform,
    width: window.innerWidth,
    height: window.innerHeight,
    utmMedium: params.get('utm_medium'),
    utmSource: params.get('utm_source'),
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    utmTerm: params.get('utm_term'),
  }
}
