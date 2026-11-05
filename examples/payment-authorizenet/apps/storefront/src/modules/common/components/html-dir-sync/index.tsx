"use client"

import { getLocaleDir } from "@i18n/config"
import { useLocale } from "next-intl"
import { useEffect } from "react"

const HtmlDirSync = () => {
  const locale = useLocale()

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getLocaleDir(locale)
  }, [locale])

  return null
}

export default HtmlDirSync
