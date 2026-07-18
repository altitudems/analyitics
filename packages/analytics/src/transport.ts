import type { IngestPayload } from './types'

export async function sendPayload(
  endpoint: string,
  payload: IngestPayload,
  options?: { keepalive?: boolean; useBeacon?: boolean },
): Promise<boolean> {
  const body = JSON.stringify(payload)

  if (options?.useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' })
      return navigator.sendBeacon(endpoint, blob)
    } catch {
      // fall through to fetch
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: options?.keepalive ?? false,
      credentials: 'omit',
    })
    return res.ok
  } catch {
    return false
  }
}
