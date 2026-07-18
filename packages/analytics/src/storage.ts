const PREFIX = 'alt_analytics:'

export function storageGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function storageSet(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(PREFIX + key, value)
  } catch {
    // private mode / quota
  }
}

export function storageRemove(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

export function storageGetJson<T>(key: string): T | null {
  const raw = storageGet(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function storageSetJson(key: string, value: unknown): void {
  storageSet(key, JSON.stringify(value))
}

export function sessionGet(key: string): string | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage.getItem(PREFIX + key)
  } catch {
    return null
  }
}

export function sessionSet(key: string, value: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(PREFIX + key, value)
  } catch {
    // ignore
  }
}
