type FormatDateParams = {
  date: string | number | Date
  locale?: string
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"]
}

/**
 * Renders a date in the language the page is served in. `toDateString()` and a
 * bare `toLocaleString()` both ignore that language and fall back to whatever
 * the runtime defaults to, which is how "Sun Aug 30 2026" ends up on a Russian
 * page, so every date the storefront shows goes through here.
 */
export const formatDate = ({
  date,
  locale = "en-US",
  dateStyle = "long",
}: FormatDateParams) => {
  return new Intl.DateTimeFormat(locale, { dateStyle }).format(new Date(date))
}

export const formatDateTime = ({
  date,
  locale = "en-US",
}: Omit<FormatDateParams, "dateStyle">) => {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}
