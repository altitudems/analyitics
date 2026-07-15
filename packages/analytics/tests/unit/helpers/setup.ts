import createClient, { type AnalyticsClient } from '../../../src/client'

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'

export const REFERRER = 'https://someothersite.com'

export const PATH =
  '/sub-path/index.html?utm_medium=email&utm_source=active%20users&utm_campaign=feature%20launch&utm_content=bottom%20cta%20button&utm_term=turtles'

export function setupEnvironment(): AnalyticsClient {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: USER_AGENT,
    configurable: true,
  })

  Object.defineProperty(document, 'referrer', {
    value: REFERRER,
    configurable: true,
  })

  window.history.pushState({}, '', PATH)

  return createClient()
}
