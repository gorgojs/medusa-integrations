"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import type { DeliveryDays } from "@lib/util/fulfillment"

const NARROW_NO_BREAK_SPACE = "\u202F"
const NO_BREAK_SPACE = "\u00A0"

const keepTogether = (text: string) =>
  text.replace(/\s/g, (space) =>
    space === "\u2009" || space === NARROW_NO_BREAK_SPACE
      ? NARROW_NO_BREAK_SPACE
      : NO_BREAK_SPACE
  )

const breakAfterDash = (range: string) => {
  const separator = /(\s+)([–—-])(\s+)/.exec(range)
  if (!separator) return keepTogether(range)

  const [match, before, dash, after] = separator
  const start = range.slice(0, separator.index)
  const end = range.slice(separator.index + match.length)

  return `${keepTogether(start)}${keepTogether(before)}${dash}${after}${keepTogether(end)}`
}

export function useFormatDeliveryDays() {
  const t = useTranslations("CheckoutPage")
  const locale = useLocale()

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
  }, [])

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
      }),
    [locale]
  )

  return useCallback(
    (days: DeliveryDays | null) => {
      if (!days) return null
      if (days.max === 0) return t("deliveryToday")
      if (!now) return null

      const dateIn = (daysFromNow: number) => {
        const date = new Date(now)
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() + daysFromNow)
        return date
      }

      const formatDate = (daysFromNow: number) =>
        keepTogether(formatter.format(dateIn(daysFromNow)))

      if (days.min !== undefined && days.max !== undefined) {
        if (days.min === days.max) return formatDate(days.min)

        if (typeof formatter.formatRange === "function") {
          return breakAfterDash(
            formatter.formatRange(dateIn(days.min), dateIn(days.max))
          )
        }

        return `${formatDate(days.min)}${NO_BREAK_SPACE}– ${formatDate(days.max)}`
      }

      if (days.max !== undefined) {
        return t("deliveryDateUntil", { date: formatDate(days.max) })
      }

      if (days.min !== undefined) {
        return t("deliveryDateFrom", { date: formatDate(days.min) })
      }

      return null
    },
    [formatter, now, t]
  )
}
