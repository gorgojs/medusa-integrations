"use client"

import CountryFlag from "@modules/common/components/country-flag"
import { updateRegion } from "@lib/data/cart"
import { updateLocale } from "@lib/data/locale-actions"
import type { Locale } from "@i18n/config"
import { ChevronDown, XMark } from "@medusajs/icons"
import type { HttpTypes } from "@medusajs/types"
import {
  Button,
  Input,
  RadioGroup,
  clx,
} from "@medusajs/ui"
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useLocaleDirection } from "@lib/hooks/use-locale-direction"

type CountryOption = {
  country: string
  region: string
  label: string
  currencyCode: string
  searchText: string
}

type LanguageOption = {
  code: string
  label: string
  description: string
  searchText: string
}

type RegionSelectProps = {
  regions: HttpTypes.StoreRegion[]
  currentCountryCode?: string
  locales: Locale[]
  className?: string
}

function getLocalizedCountryName(
  isoCode: string,
  locale: string,
  fallback: string
) {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(
        isoCode.toUpperCase()
      ) ?? fallback
    )
  } catch {
    return fallback
  }
}

function getLocalizedLanguageName(
  code: string,
  fallback: string,
  displayLocale: string
) {
  try {
    return (
      new Intl.DisplayNames([displayLocale], { type: "language" }).of(code) ??
      fallback
    )
  } catch {
    return fallback
  }
}

type RegionOptionRowProps = {
  id: string
  value: string
  label: string
  description: string
  flagCode?: string
}

const RegionOptionRow = ({
  id,
  value,
  label,
  description,
  flagCode,
}: RegionOptionRowProps) => {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-x-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-ui-bg-base-hover transition-colors min-w-0"
    >
      <RadioGroup.Item value={value} id={id} />
      <span className="flex flex-col min-w-0">
        <span className="txt-compact-small text-ui-fg-base truncate">{label}</span>
        <span className="flex items-center gap-x-1.5 txt-compact-xsmall text-ui-fg-subtle truncate">
          {flagCode ? (
            <CountryFlag
              countryCode={flagCode}
              style={{ width: "14px", height: "14px" }}
              className="shrink-0 rounded-sm"
            />
          ) : null}
          {description}
        </span>
      </span>
    </label>
  )
}

const RegionSelect = ({
  regions,
  currentCountryCode,
  locales,
  className,
}: RegionSelectProps) => {
  const t = useTranslations("RegionSelect")
  const dir = useLocaleDirection()
  const tLang = useTranslations("LanguageSelect")
  const currentLocale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [open, setOpen] = useState(false)
  const [pendingCountry, setPendingCountry] = useState(currentCountryCode)
  const [pendingLocale, setPendingLocale] = useState(currentLocale)
  const [query, setQuery] = useState("")

  const countryOptions = useMemo<CountryOption[]>(() => {
    return regions
      .flatMap((r) =>
        (r.countries ?? []).map((c) => {
          const iso = c.iso_2 ?? ""
          const label = getLocalizedCountryName(iso, currentLocale, c.display_name ?? "")
          const currencyCode = r.currency_code?.toUpperCase() ?? ""
          const namesInAllLocales = locales.map((l) =>
            getLocalizedCountryName(iso, l.code, c.display_name ?? "")
          )
          const searchText = [
            ...namesInAllLocales,
            c.display_name ?? "",
            iso,
            currencyCode,
          ]
            .join(" ")
            .toLowerCase()

          return { country: iso, region: r.id, label, currencyCode, searchText }
        })
      )
      .filter((o) => o.country)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [regions, currentLocale, locales])

  const languageOptions = useMemo<LanguageOption[]>(() => {
    return locales.map((l) => {
      const nativeLabel = tLang(`locales.${l.code}`, { fallback: l.name })
      const description = getLocalizedLanguageName(l.code, nativeLabel, currentLocale)
      const namesInAllLocales = locales.map((loc) =>
        getLocalizedLanguageName(l.code, nativeLabel, loc.code)
      )
      const searchText = [nativeLabel, ...namesInAllLocales, l.code]
        .join(" ")
        .toLowerCase()

      return { code: l.code, label: nativeLabel, description, searchText }
    })
  }, [locales, currentLocale, tLang])

  const normalizedQuery = query.trim().toLowerCase()

  const filteredCountryOptions = useMemo(() => {
    if (!normalizedQuery) return countryOptions
    return countryOptions.filter((opt) => opt.searchText.includes(normalizedQuery))
  }, [countryOptions, normalizedQuery])

  const filteredLanguageOptions = useMemo(() => {
    if (!normalizedQuery) return languageOptions
    return languageOptions.filter((opt) => opt.searchText.includes(normalizedQuery))
  }, [languageOptions, normalizedQuery])

  const selectedCountryOption =
    countryOptions.find((o) => o.country === currentCountryCode) ??
    countryOptions[0]

  useEffect(() => {
    if (!open) return
    setPendingCountry(selectedCountryOption?.country)
    setPendingLocale(currentLocale)
    setQuery("")
  }, [open, selectedCountryOption?.country, currentLocale])

  if (!selectedCountryOption) {
    return null
  }

  const triggerFlagCode = selectedCountryOption.country.toUpperCase()

  function handleApply() {
    const countryChanged =
      !!pendingCountry && pendingCountry !== selectedCountryOption?.country
    const localeChanged = pendingLocale !== currentLocale

    if (!countryChanged && !localeChanged) {
      setOpen(false)
      return
    }

    const segments = pathname.split("/").filter(Boolean)
    if (localeChanged) {
      segments[0] = pendingLocale
    }
    const newPath = "/" + segments.join("/")

    startTransition(async () => {
      if (localeChanged) {
        await updateLocale(pendingLocale)
      }
      if (countryChanged && pendingCountry) {
        await updateRegion(pendingCountry, newPath)
        return
      }
      setOpen(false)
      if (localeChanged) {
        router.push(newPath)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="nav-region-select-button"
        className={clx(
          "flex items-center gap-x-1.5 text-ui-fg-subtle hover:text-ui-fg-base transition-colors",
          className
        )}
      >
        <CountryFlag
          countryCode={triggerFlagCode}
          style={{ width: "16px", height: "16px" }}
          className="shrink-0 rounded-sm"
        />
        <span className="uppercase">{currentLocale}</span>
        <ChevronDown className="shrink-0 w-2.5 h-2.5" />
      </button>

      <Transition show={open}>
        <Dialog onClose={() => setOpen(false)} className="relative z-[65]">
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-0 flex justify-end">
            <TransitionChild
              enter="ease-out duration-250"
              enterFrom="opacity-0 translate-x-8"
              enterTo="opacity-100 translate-x-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-x-0"
              leaveTo="opacity-0 translate-x-8"
            >
              <DialogPanel className="flex flex-col h-[calc(100%-16px)] w-[calc(100%-16px)] sm:w-1/3 2xl:w-1/4 sm:min-w-[360px] m-2 rounded-rounded bg-ui-bg-base p-6 gap-6">
                <div className="flex items-center justify-between shrink-0">
                  <DialogTitle className="txt-xlarge text-ui-fg-base">
                    {t("title")}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("close")}
                    data-testid="close-region-select-button"
                    className="text-ui-fg-subtle hover:text-ui-fg-base transition-colors p-0.5"
                  >
                    <XMark />
                  </button>
                </div>

                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("placeholder")}
                />

                <div className="flex flex-1 min-h-0 gap-6">
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="txt-compact-small-plus text-ui-fg-subtle shrink-0 mb-2">
                      {t("tabCountry")}
                    </span>
                    <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar">
                      <RadioGroup
                        dir={dir}
                        value={pendingCountry}
                        onValueChange={setPendingCountry}
                        disabled={isPending}
                        className="gap-1"
                      >
                        {filteredCountryOptions.map((opt) => (
                          <RegionOptionRow
                            key={opt.country}
                            id={`region-country-${opt.country}`}
                            value={opt.country}
                            label={opt.label}
                            description={opt.currencyCode}
                            flagCode={opt.country.toUpperCase()}
                          />
                        ))}
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="w-px bg-ui-border-base shrink-0" />

                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="txt-compact-small-plus text-ui-fg-subtle shrink-0 mb-2">
                      {t("tabLanguage")}
                    </span>
                    <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar">
                      <RadioGroup
                        dir={dir}
                        value={pendingLocale}
                        onValueChange={setPendingLocale}
                        disabled={isPending}
                        className="gap-1"
                      >
                        {filteredLanguageOptions.map((opt) => (
                          <RegionOptionRow
                            key={opt.code}
                            id={`region-language-${opt.code}`}
                            value={opt.code}
                            label={opt.label}
                            description={opt.description}
                          />
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  size="large"
                  className="w-full shrink-0"
                  disabled={isPending}
                  isLoading={isPending}
                  onClick={handleApply}
                >
                  {t("apply")}
                </Button>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default RegionSelect
