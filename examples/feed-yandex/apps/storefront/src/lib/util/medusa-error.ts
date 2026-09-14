type MedusaError = {
  response?: {
    data: { message?: string } | string
  }
  request?: unknown
  message?: string
}

export default function medusaError(error: unknown): never {
  const err = error as MedusaError

  if (err.response) {
    const data = err.response.data
    const message =
      typeof data === "object" && data !== null
        ? data.message || String(data)
        : data

    const clean = String(message ?? "").trim()

    throw new Error(clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "")
  } else if (err.request) {
    throw new Error("Network error")
  } else {
    throw new Error(err.message ?? "")
  }
}
