import type { LicenseStateEntry } from "../../modules/integration/types"

/** Where the merchant manages projects, domains and subscriptions. */
export const GORGO_CABINET_URL = "https://app.gorgojs.com"

/** The cabinet sends this on to the key of the merchant's project. For a key that names no project. */
export const GORGO_TOKENS_URL = `${GORGO_CABINET_URL}/tokens`

/** A subscription that will not renew turns orange this many days before it ends. */
const ENDING_SOON_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

export type LicenseTone = "green" | "grey" | "orange" | "red"

/** An i18n key and its values. */
export type LicenseText = { key: string; values?: Record<string, string> }

export type LicenseView = {
  tone: LicenseTone
  /** The line in the integrations table. */
  line: LicenseText
  /** The title of the block on the integration's page. */
  title: LicenseText
  /** What is wrong and how to fix it. */
  hint?: LicenseText
  /** Where the license was confirmed, shown instead of a hint while it is fine. `null` environment is localhost. */
  context?: { project?: string; environment?: string | null }
  /** When the platform last answered, formatted. */
  checked?: string
  /** The one link that fixes the problem, or the account while there is none. */
  action?: { key: string; href: string }
}

/** Formatting in the admin's language. Passed in, so the tests of `describeLicense` do not depend on Intl. */
export type LicenseFormat = {
  /** "Nov 12, 2026" */
  date: (iso: string) => string
  /** "in 2 days", "tomorrow" */
  inDays: (days: number) => string
  /** "2 hr. ago" */
  ago: (iso: string) => string
}

/** Medusa names languages `ptBR` and `zhCN`, which Intl rejects. */
function intlLocale(language: string): string {
  try {
    return Intl.getCanonicalLocales(language.replace(/^([a-z]{2})([A-Z]{2})$/, "$1-$2"))[0] ?? "en"
  } catch {
    return "en"
  }
}

export function licenseFormat(language: string, now: number): LicenseFormat {
  const locale = intlLocale(language)
  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium" })
  const days = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const since = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })
  return {
    date: (iso) => dates.format(new Date(iso)),
    inDays: (count) => days.format(count, "day"),
    ago: (iso) => {
      const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000))
      if (seconds < 60) return since.format(0, "second")
      if (seconds < 3600) return since.format(-Math.floor(seconds / 60), "minute")
      if (seconds < 86400) return since.format(-Math.floor(seconds / 3600), "hour")
      return since.format(-Math.floor(seconds / 86400), "day")
    },
  }
}

const keyOf = (key: string) => `integration.license.${key}`

const text = (key: string, values?: Record<string, string>): LicenseText =>
  values ? { key: keyOf(key), values } : { key: keyOf(key) }

const action = (key: string, href: string) => ({ key: keyOf(key), href })

/** A hint that names a value the platform did not send is left out, not shown with a blank. */
function hintWith(key: string, values: Record<string, string | null | undefined>): LicenseText | undefined {
  if (Object.values(values).some((value) => !value)) return undefined
  return text(key, values as Record<string, string>)
}

/**
 * What the admin shows for a package's license: the tone, the table line, the card's title and hint,
 * and the one action. The table and the card only draw it. Each branch is a row of the state table
 * in the integration-license-ui plan.
 */
export function describeLicense(
  entry: LicenseStateEntry,
  { now, format }: { now: number; format: LicenseFormat },
): LicenseView {
  const checked = entry.checked_at ? format.ago(entry.checked_at) : undefined
  const projectUrl = entry.project?.url?.startsWith("https://") ? entry.project.url : GORGO_CABINET_URL
  const latest = entry.latest_allowed_version

  const view = (
    tone: LicenseTone,
    title: LicenseText,
    { hint, context, action }: Pick<LicenseView, "hint" | "context" | "action"> = {},
  ): LicenseView => ({
    tone,
    line: title,
    title,
    ...(hint ? { hint } : {}),
    ...(context ? { context } : {}),
    ...(checked ? { checked } : {}),
    ...(action ? { action } : {}),
  })

  switch (entry.state) {
    case "pending":
      return view("grey", text("title.pending"), { hint: text("hint.pending") })

    case "unreachable":
      return view("orange", text("title.unreachable"), { hint: text("hint.unreachable") })

    case "failed":
      switch (entry.reason) {
        case "missing":
        case "malformed":
          return view("red", text(`title.${entry.reason}`), {
            hint: text(`hint.${entry.reason}`),
            action: action("action.getKey", GORGO_TOKENS_URL),
          })
        case "invalid_token":
          return view("red", text("title.invalid_token"), {
            hint: text("hint.invalid_token"),
            action: action("action.reissueKey", GORGO_TOKENS_URL),
          })
        case "no_subscription":
          return view("red", text("title.no_subscription"), {
            hint: hintWith("hint.no_subscription", { project: entry.project?.name }),
            action: action("action.subscribe", projectUrl),
          })
        case "domain_not_allowed":
          return view("red", text("title.domain_not_allowed"), {
            hint: hintWith("hint.domain_not_allowed", { host: entry.host, project: entry.project?.name }),
            action: action("action.addDomain", projectUrl),
          })
        case "version_after_cutoff":
          return view("orange", text("title.version_after_cutoff"), {
            hint: hintWith("hint.version_after_cutoff", { version: latest }),
            action: action("action.renew", projectUrl),
          })
        case "version_unverifiable":
          return view("orange", text("title.version_unverifiable"), { hint: text("hint.version_unverifiable") })
        default:
          return view("red", text("title.unknown"), {
            hint: text("hint.unknown"),
            action: action("action.account", projectUrl),
          })
      }
  }

  const cutoff = entry.subscription?.cutoff
  if (cutoff && Date.parse(cutoff) <= now) {
    return view("orange", text("title.ended", { date: format.date(cutoff) }), {
      hint: hintWith("hint.ended", { version: latest }),
      action: action("action.renew", projectUrl),
    })
  }

  const fine = {
    context: {
      ...(entry.project ? { project: entry.project.name } : {}),
      ...(entry.environment !== undefined ? { environment: entry.environment?.name ?? null } : {}),
    },
    action: action("action.account", projectUrl),
  }
  const endsAt = entry.subscription?.ends_at
  const renews = entry.subscription?.renews

  if (!endsAt) return view("green", text("title.active"), fine)
  if (renews) {
    return { ...view("green", text("title.renews", { date: format.date(endsAt) }), fine), line: text("title.active") }
  }

  // Whether the subscription renews is unknown until the platform says so; no warning without it.
  const daysLeft = Math.ceil((Date.parse(endsAt) - now) / DAY_MS)
  if (renews === false && daysLeft <= ENDING_SOON_DAYS) {
    return view("orange", text("title.ending", { when: format.inDays(Math.max(daysLeft, 0)) }), {
      hint: text("hint.ending"),
      action: action("action.renew", projectUrl),
    })
  }
  return view("green", text("title.until", { date: format.date(endsAt) }), fine)
}
