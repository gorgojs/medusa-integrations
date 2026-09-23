"use client"

import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import {
  Funnel,
  XMark,
  ChevronRightMini,
  ChevronLeftMini,
} from "@medusajs/icons"
import { Checkbox, RadioGroup } from "@medusajs/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import type { ProductOptionFilterGroup } from "@lib/data/products"
import type { SortOptions } from "../refinement-list/sort-products"
import { useLocaleDirection } from "@lib/hooks/use-locale-direction"

type MobileRefinementProps = {
  sortBy: SortOptions
  optionFilters?: ProductOptionFilterGroup[]
  className?: string
}

const MobileRefinement = ({
  sortBy,
  optionFilters = [],
  className,
}: MobileRefinementProps) => {
  const t = useTranslations()
  const dir = useLocaleDirection()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const mql = window.matchMedia("(min-width: 1024px)")
    const closeOnDesktop = (matches: boolean) => {
      if (matches) {
        setOpen(false)
        setActiveGroupId(null)
      }
    }

    closeOnDesktop(mql.matches)
    const handler = (event: MediaQueryListEvent) => closeOnDesktop(event.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [open])

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)
      params.delete("page")

      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname

      if (nextPath !== currentPath) {
        router.push(nextPath)
      }
    },
    [pathname, router, searchParams]
  )

  const setSort = (value: string) =>
    updateQueryParams((params) => params.set("sortBy", value))

  const selectedValueIds = useMemo(
    () => new Set(parseOptionValueIds(searchParams)),
    [searchParams]
  )

  const toggleValue = (valueId: string, checked: boolean) =>
    updateQueryParams((params) => {
      const current = new Set(parseOptionValueIds(searchParams))
      if (checked) {
        current.add(valueId)
      } else {
        current.delete(valueId)
      }
      params.delete(OPTION_VALUE_QUERY_KEY)
      current.forEach((id) => params.append(OPTION_VALUE_QUERY_KEY, id))
    })

  const sortOptions = [
    { value: "created_at", label: t("SortSelect.latestArrivals") },
    { value: "price_asc", label: t("SortSelect.priceLowHigh") },
    { value: "price_desc", label: t("SortSelect.priceHighLow") },
  ]

  const groups = optionFilters.filter((group) => group.values.length > 0)
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null

  const close = () => {
    setOpen(false)
    setActiveGroupId(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("Filters.title")}
        className={className}
      >
        <Funnel />
      </button>

      <Transition show={open}>
        <Dialog onClose={close} className="relative z-50">
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-black/25 backdrop-blur-[2px]"
              aria-hidden="true"
            />
          </TransitionChild>

          <div className="fixed inset-0 flex items-end justify-center">
            <TransitionChild
              enter="ease-out duration-250"
              enterFrom="opacity-0 translate-y-8"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-8"
            >
              <DialogPanel className="relative flex w-full flex-col h-[85dvh] bg-ui-bg-base rounded-t-xl shadow-elevation-modal">
                <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-3">
                  {activeGroup ? (
                    <button
                      type="button"
                      onClick={() => setActiveGroupId(null)}
                      className="flex items-center gap-3 text-ui-fg-base"
                    >
                      <ChevronLeftMini className="rtl:rotate-180" />
                      <span className="txt-xlarge">{activeGroup.title}</span>
                    </button>
                  ) : (
                    <span className="txt-xlarge text-ui-fg-base">
                      {t("Filters.title")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t("Common.close")}
                    className="p-0.5 text-ui-fg-muted hover:text-ui-fg-base transition-colors"
                  >
                    <XMark />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-8">
                  {activeGroup ? (
                    <div className="flex flex-col gap-4 pt-2">
                      {activeGroup.values.map((value) => (
                        <label
                          key={value.id}
                          htmlFor={`filter-${value.id}`}
                          className="flex cursor-pointer items-center gap-4"
                        >
                          <Checkbox
                            id={`filter-${value.id}`}
                            checked={selectedValueIds.has(value.id)}
                            onCheckedChange={(checked) =>
                              toggleValue(value.id, checked === true)
                            }
                          />
                          <span className="txt-compact-large text-ui-fg-base">
                            {value.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="mb-3 txt-compact-small text-ui-fg-subtle">
                        {t("Filters.sort")}
                      </p>
                      <RadioGroup dir={dir} value={sortBy} onValueChange={setSort}>
                        <div className="flex flex-col gap-3">
                          {sortOptions.map((option) => (
                            <label
                              key={option.value}
                              htmlFor={`sort-${option.value}`}
                              className="flex cursor-pointer items-center gap-3"
                            >
                              <RadioGroup.Item
                                id={`sort-${option.value}`}
                                value={option.value}
                              />
                              <span className="txt-compact-medium text-ui-fg-base">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </RadioGroup>

                      {groups.length > 0 && (
                        <div className="mt-6 flex flex-col">
                          {groups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => setActiveGroupId(group.id)}
                              className="flex items-center justify-between py-2 text-ui-fg-base"
                            >
                              <span className="txt-large">
                                {group.title}
                              </span>
                              <ChevronRightMini className="text-ui-fg-muted rtl:rotate-180" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileRefinement
