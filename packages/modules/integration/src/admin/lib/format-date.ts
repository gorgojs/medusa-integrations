import { intlLocale } from "./describe-license"

/** How the change history shows a moment, in the admin's language. */
export type ChangeTimeFormat = {
  /** "5 min. ago" within a week, the date after that. */
  relative: (iso: string) => string
  /** "October 30, 2026 at 12:14:03", for the tooltip and the change card. */
  full: (iso: string) => string
}

const WEEK_SECONDS = 7 * 86400

export function changeTimeFormat(language: string, now: number): ChangeTimeFormat {
  const locale = intlLocale(language)
  const since = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" })
  const full = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "medium" })
  return {
    relative: (iso) => {
      const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000))
      if (seconds < 60) return since.format(0, "second")
      if (seconds < 3600) return since.format(-Math.floor(seconds / 60), "minute")
      if (seconds < 86400) return since.format(-Math.floor(seconds / 3600), "hour")
      if (seconds < WEEK_SECONDS) return since.format(-Math.floor(seconds / 86400), "day")
      return date.format(new Date(iso))
    },
    full: (iso) => full.format(new Date(iso)),
  }
}
