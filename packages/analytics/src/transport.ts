import type { IngestPayload } from './types'

export interface SendResult {
  ok: boolean
  status?: number
  retryAfterMs?: number
}

export async function sendPayload(
  endpoint: string,
  payload: IngestPayload,
  options?: { keepalive?: boolean; useBeacon?: boolean },
): Promise<SendResult> {
  const body = JSON.stringify(payload)

  if (options?.useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' })
      const queued = navigator.sendBeacon(endpoint, blob)
      // Beacon has no HTTP status — treat queued as best-effort success
      return { ok: queued }
    } catch {
      // fall through
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

    if (res.ok) return { ok: true, status: res.status }

    const retryAfter = res.headers.get('retry-after')
    let retryAfterMs: number | undefined
    if (retryAfter) {
      const asInt = Number(retryAfter)
      retryAfterMs = Number.isFinite(asInt) ? asInt * 1000 : undefined
    }

    return { ok: false, status: res.status, retryAfterMs }
  } catch {
    return { ok: false }
  }
}
