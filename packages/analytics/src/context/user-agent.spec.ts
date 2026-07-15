import { parseUserAgent } from './user-agent'

describe('parseUserAgent', () => {
  it('parses Chrome on Windows from a UA string', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'

    expect(parseUserAgent(ua, undefined)).toEqual({
      browser: 'Chrome',
      browserVersion: '80.0.3987.163',
      os: 'Windows',
      osVersion: '10.0',
      platform: 'desktop',
    })
  })

  it('prefers client hints when available', () => {
    const result = parseUserAgent('ignored', {
      brands: [
        { brand: 'Chromium', version: '120' },
        { brand: 'Google Chrome', version: '120' },
        { brand: 'Not.A/Brand', version: '99' },
      ],
      mobile: false,
      platform: 'macOS',
    })

    expect(result.browser).toBe('Chrome')
    expect(result.browserVersion).toBe('120')
    expect(result.os).toBe('macOS')
    expect(result.platform).toBe('desktop')
  })
})
