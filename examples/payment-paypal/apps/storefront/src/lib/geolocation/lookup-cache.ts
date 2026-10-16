const HIT_TTL_MS = 60 * 60 * 1000
const MISS_TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 500

const cache = new Map<string, { countryCode: string | null; expiresAt: number }>()
const inFlight = new Map<string, Promise<string | null>>()

const prune = (now: number) => {
  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      cache.delete(key)
    }
  })

  if (cache.size > MAX_ENTRIES) {
    cache.clear()
  }
}

export const withLookupCache = (
  key: string,
  lookup: () => Promise<string | null | undefined>,
  ttlMs: number = HIT_TTL_MS
): Promise<string | null> => {
  const cached = cache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.countryCode)
  }

  const pending = inFlight.get(key)

  if (pending) {
    return pending
  }

  const promise = lookup()
    .catch(() => null)
    .then((countryCode) => {
      if (countryCode === undefined || ttlMs <= 0) {
        return countryCode ?? null
      }

      const now = Date.now()
      prune(now)
      cache.set(key, {
        countryCode,
        expiresAt: now + (countryCode ? ttlMs : MISS_TTL_MS),
      })
      return countryCode
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, promise)

  return promise
}
