export interface ParsedUserAgent {
  browser: string | null
  browserVersion: string | null
  os: string | null
  osVersion: string | null
  platform: string | null
}

interface NavigatorUABrandVersion {
  brand: string
  version: string
}

interface NavigatorUAData {
  brands: ReadonlyArray<NavigatorUABrandVersion>
  mobile: boolean
  platform: string
}

function pickBrand(brands: ReadonlyArray<NavigatorUABrandVersion>): NavigatorUABrandVersion | undefined {
  const meaningful = brands.filter((b) => b.brand && !/not[.\s_-]*a[.\s_-]*brand/i.test(b.brand))
  // Prefer a named browser over Chromium when both are present
  return (
    meaningful.find((b) => /chrome|firefox|safari|edge|opera/i.test(b.brand)) ??
    meaningful[meaningful.length - 1] ??
    meaningful[0]
  )
}

function normalizeBrowserName(name: string): string {
  if (/chrome/i.test(name)) return 'Chrome'
  if (/firefox/i.test(name)) return 'Firefox'
  if (/safari/i.test(name)) return 'Safari'
  if (/edge/i.test(name)) return 'Edge'
  if (/opera|opr/i.test(name)) return 'Opera'
  return name
}

function normalizeOsName(name: string): string {
  if (/win/i.test(name)) return 'Windows'
  if (/mac/i.test(name)) return 'macOS'
  if (/android/i.test(name)) return 'Android'
  if (/ios|iphone|ipad/i.test(name)) return 'iOS'
  if (/linux/i.test(name)) return 'Linux'
  if (/cros/i.test(name)) return 'Chrome OS'
  return name
}

function detectPlatform(userAgent: string, mobileHint?: boolean): string {
  if (mobileHint === true) return 'mobile'
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return 'tablet'
  if (/mobi|iphone|android(?!.*tablet)/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

function parseFromClientHints(uaData: NavigatorUAData, userAgent: string): ParsedUserAgent {
  const brand = pickBrand(uaData.brands)
  return {
    browser: brand ? normalizeBrowserName(brand.brand) : null,
    browserVersion: brand?.version ?? null,
    os: uaData.platform ? normalizeOsName(uaData.platform) : null,
    osVersion: null,
    platform: detectPlatform(userAgent, uaData.mobile),
  }
}

function match(ua: string, pattern: RegExp): RegExpMatchArray | null {
  return ua.match(pattern)
}

function parseFromUserAgentString(userAgent: string): ParsedUserAgent {
  const browserMatch =
    match(userAgent, /Edg\/([\d.]+)/) ??
    match(userAgent, /OPR\/([\d.]+)/) ??
    match(userAgent, /Chrome\/([\d.]+)/) ??
    match(userAgent, /Firefox\/([\d.]+)/) ??
    match(userAgent, /Version\/([\d.]+).*Safari/) ??
    match(userAgent, /Safari\/([\d.]+)/)

  let browser: string | null = null
  if (/Edg\//.test(userAgent)) browser = 'Edge'
  else if (/OPR\//.test(userAgent)) browser = 'Opera'
  else if (/Chrome\//.test(userAgent)) browser = 'Chrome'
  else if (/Firefox\//.test(userAgent)) browser = 'Firefox'
  else if (/Safari\//.test(userAgent)) browser = 'Safari'

  const osMatch =
    match(userAgent, /Windows NT ([\d.]+)/) ??
    match(userAgent, /Android ([\d.]+)/) ??
    match(userAgent, /CPU (?:iPhone )?OS ([\d_]+)/) ??
    match(userAgent, /Mac OS X ([\d_]+)/) ??
    match(userAgent, /(Linux)/)

  let os: string | null = null
  let osVersion: string | null = null
  if (/Windows NT/.test(userAgent)) {
    os = 'Windows'
    osVersion = osMatch?.[1] ?? null
  } else if (/Android/.test(userAgent)) {
    os = 'Android'
    osVersion = osMatch?.[1] ?? null
  } else if (/iPhone|iPad|iPod|CPU (?:iPhone )?OS/.test(userAgent)) {
    os = 'iOS'
    osVersion = osMatch?.[1]?.replace(/_/g, '.') ?? null
  } else if (/Mac OS X/.test(userAgent)) {
    os = 'macOS'
    osVersion = osMatch?.[1]?.replace(/_/g, '.') ?? null
  } else if (/Linux/.test(userAgent)) {
    os = 'Linux'
  } else if (/CrOS/.test(userAgent)) {
    os = 'Chrome OS'
  }

  return {
    browser,
    browserVersion: browserMatch?.[1] ?? null,
    os,
    osVersion,
    platform: detectPlatform(userAgent),
  }
}

function getNavigatorUAData(): NavigatorUAData | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData
}

/**
 * Prefer User-Agent Client Hints when present; fall back to UA string parsing.
 */
export function parseUserAgent(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  uaData = getNavigatorUAData(),
): ParsedUserAgent {
  if (uaData?.brands?.length) {
    return parseFromClientHints(uaData, userAgent)
  }
  return parseFromUserAgentString(userAgent)
}
