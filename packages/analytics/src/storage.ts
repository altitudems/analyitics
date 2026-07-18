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
    // private mode / quota — ignore
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
