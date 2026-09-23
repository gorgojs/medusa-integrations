"use client"

import { getLocaleDir, type LocaleDirection } from "@i18n/config"
import { useLocale } from "next-intl"

/**
 * Writing direction of the active locale. Radix primitives read direction from
 * a `dir` prop rather than the DOM `dir` attribute, so interactive roots
 * (RadioGroup, DropdownMenu, Accordion) have to be told explicitly.
 */
export const useLocaleDirection = (): LocaleDirection => getLocaleDir(useLocale())
