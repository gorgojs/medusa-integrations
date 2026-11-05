export const getBaseURL = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
}

export const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "ru"

/**
 * Store name. Rendered as the wordmark in the header, footer and checkout, and
 * emitted as schema.org `brand`/`seller` and the llms.txt heading. It is a
 * brand string rather than copy, so it is deliberately not translated in
 * `messages/*.json`.
 */
export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME || "Gorgo Medusa Store"

/**
 * GA4 measurement ID. Analytics is skipped entirely when it is unset, which is
 * the case in local development unless a developer opts in.
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
