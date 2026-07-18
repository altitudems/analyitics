import { createId } from './id'
import { sessionGet, sessionSet } from './storage'

const KEY_SESSION = 'sessionId'
const KEY_SESSION_AT = 'sessionAt'
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

/** Session id in sessionStorage; refreshes activity; rotates after idle timeout. */
export function getSessionId(timeoutMs = DEFAULT_TIMEOUT_MS): string {
  const now = Date.now()
  const existing = sessionGet(KEY_SESSION)
  const atRaw = sessionGet(KEY_SESSION_AT)
  const at = atRaw ? Number(atRaw) : 0

  if (existing && at && now - at < timeoutMs) {
    sessionSet(KEY_SESSION_AT, String(now))
    return existing
  }

  const next = createId()
  sessionSet(KEY_SESSION, next)
  sessionSet(KEY_SESSION_AT, String(now))
  return next
}
