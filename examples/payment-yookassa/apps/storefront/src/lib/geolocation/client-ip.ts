const IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-real-ip",
  "x-client-ip",
  "fly-client-ip",
]

const PRIVATE_IPV4 =
  /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/

export type ClientIp =
  | { kind: "public"; ip: string }
  | { kind: "local" }
  | { kind: "unknown" }

export const normalizeIp = (value: string): string => {
  let ip = value.trim().toLowerCase()

  if (ip.startsWith("[")) {
    const end = ip.indexOf("]")
    ip = end > 0 ? ip.slice(1, end) : ip.slice(1)
  } else if (ip.split(":").length === 2) {
    ip = ip.slice(0, ip.indexOf(":"))
  }

  return IPV4_MAPPED.exec(ip)?.[1] ?? ip
}

export const isPrivateIp = (ip: string): boolean => {
  if (PRIVATE_IPV4.test(ip)) {
    return true
  }

  return (
    ip === "::" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80")
  )
}

export const resolveClientIp = (headers: Headers): ClientIp => {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]
  const candidates = [forwarded, ...IP_HEADERS.map((h) => headers.get(h))]
  let sawPrivate = false

  for (const candidate of candidates) {
    if (!candidate?.trim()) {
      continue
    }

    const ip = normalizeIp(candidate)

    if (!ip) {
      continue
    }

    if (isPrivateIp(ip)) {
      sawPrivate = true
      continue
    }

    return { kind: "public", ip }
  }

  return sawPrivate ? { kind: "local" } : { kind: "unknown" }
}

export const getClientIp = (headers: Headers): string | null => {
  const client = resolveClientIp(headers)
  return client.kind === "public" ? client.ip : null
}
