import { mockUserAgent } from 'jest-useragent-mock'
import { AnalyticsContext } from '../../../src/context'
import client, { AnalyticsClient } from '../../../src/client'

export let context: AnalyticsContext | null
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
export const REFERRER = 'https://someothersite.com'
export const PATH =
  '/sub-path/index.html?utm_medium=email&utm_source=active%20users&utm_campaign=feature%20launch&utm_content=bottom%20cta%20button&utm_term=turtles'

export function setupEnvironment(): AnalyticsClient {
  // Set userAgent
  mockUserAgent(USER_AGENT)
  // Set Referrer
  Object.defineProperty(document, 'referrer', { value: REFERRER, configurable: true })
  // Set window.location
  window.history.pushState({}, '', PATH)

  // Create client, store context
  return client()
}
