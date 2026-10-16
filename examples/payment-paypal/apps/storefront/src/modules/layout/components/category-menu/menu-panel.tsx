"use client"

import { XMark, ChevronRightMini, ChevronLeftMini } from "@medusajs/icons"
import { AnimatePresence, domAnimation, LazyMotion, m } from "framer-motion"
import { Checkbox } from "@medusajs/ui"
import { Link } from "@i18n/navigation"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import type { HttpTypes } from "@medusajs/types"
import {
  SUBCATEGORY_QUERY_KEY,
  parseSubcategoryHandles,
} from "@lib/util/subcategory-filters"
import { useLocaleDirection } from "@lib/hooks/use-locale-direction"

type CategoryMenuPanelProps = {
  categories: HttpTypes.StoreProductCategory[]
  isOpen: boolean
  onClose: () => void
}

type Direction = "forward" | "backward"

/**
 * `x` offsets are physical, so the drill-in/drill-out slide has to be inverted
 * for RTL locales: "forward" travels leftwards there.
 */
type SlideCustom = { nav: Direction; rtl: boolean }

const slidesLeft = ({ nav, rtl }: SlideCustom) => (nav === "forward") !== rtl

const slideVariants = {
  enter: (custom: SlideCustom) => ({
    x: slidesLeft(custom) ? "60%" : "-60%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (custom: SlideCustom) => ({
    x: slidesLeft(custom) ? "-60%" : "60%",
    opacity: 0,
  }),
}

const CategoryMenuPanel = ({
  categories,
  isOpen,
  onClose,
}: CategoryMenuPanelProps) => {
  const t = useTranslations("CategoryMenu")
  const tc = useTranslations("Common")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>("forward")
  const isRtl = useLocaleDirection() === "rtl"
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set())

  const topLevel = categories.filter((c) => !c.parent_category_id)
  const activeCategory = categories.find((c) => c.id === activeId) ?? null

  const close = () => {
    onClose()
    setActiveId(null)
  }

  const goForward = (category: HttpTypes.StoreProductCategory) => {
    setDirection("forward")
    const onThisCategory = pathname.includes(`/categories/${category.handle}`)
    setSelectedSubs(
      new Set(onThisCategory ? parseSubcategoryHandles(searchParams) : [])
    )
    setActiveId(category.id)
  }

  const goBack = () => {
    setDirection("backward")
    setActiveId(null)
  }

  const toggleSub = (
    category: HttpTypes.StoreProductCategory,
    subHandle: string,
    checked: boolean
  ) => {
    const next = new Set(selectedSubs)
    if (checked) {
      next.add(subHandle)
    } else {
      next.delete(subHandle)
    }
    setSelectedSubs(next)

    const params = new URLSearchParams()
    next.forEach((handle) => params.append(SUBCATEGORY_QUERY_KEY, handle))
    const queryString = params.toString()
    router.push(
      `/categories/${category.handle}${queryString ? `?${queryString}` : ""}`
    )
  }

  return createPortal(
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex flex-col bg-ui-bg-base p-10"
          >
            <div className="flex h-8 items-center justify-between">
              {activeCategory ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1 text-ui-fg-subtle transition-colors hover:text-ui-fg-base"
                >
                  <ChevronLeftMini className="rtl:rotate-180" />
                  {activeCategory.name}
                </button>
              ) : (
                <span className="text-ui-fg-subtle">{t("title")}</span>
              )}
              <button
                type="button"
                onClick={close}
                aria-label={tc("close")}
                className="text-ui-fg-subtle transition-colors hover:text-ui-fg-base"
              >
                <XMark />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence
                custom={{ nav: direction, rtl: isRtl }}
                initial={false}
              >
                {!activeCategory ? (
                  <m.div
                    key="root"
                    custom={{ nav: direction, rtl: isRtl }}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="absolute inset-0 flex items-center"
                  >
                    <ul className="flex flex-col items-start gap-4">
                      {topLevel.map((category) =>
                        category.category_children?.length ? (
                          <li key={category.id}>
                            <button
                              type="button"
                              onClick={() => goForward(category)}
                              className="flex items-center gap-1 text-2xl text-ui-fg-base transition-colors hover:text-ui-fg-subtle"
                            >
                              {category.name}
                              <ChevronRightMini className="rtl:rotate-180" />
                            </button>
                          </li>
                        ) : (
                          <li key={category.id}>
                            <Link
                              href={`/categories/${category.handle}`}
                              onClick={close}
                              className="text-2xl text-ui-fg-base transition-colors hover:text-ui-fg-subtle"
                            >
                              {category.name}
                            </Link>
                          </li>
                        )
                      )}
                    </ul>
                  </m.div>
                ) : (
                  <m.div
                    key={activeCategory.id}
                    custom={{ nav: direction, rtl: isRtl }}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    className="absolute inset-0 flex items-center"
                  >
                    <ul className="flex flex-col items-start gap-4">
                      <li>
                        <Link
                          href={`/categories/${activeCategory.handle}`}
                          onClick={close}
                          className="text-2xl text-ui-fg-base transition-colors hover:text-ui-fg-subtle"
                        >
                          {t("viewAll")}
                        </Link>
                      </li>
                      {activeCategory.category_children.map((sub) => (
                        <li key={sub.id}>
                          <label
                            htmlFor={`cat-${sub.id}`}
                            className="flex cursor-pointer items-center gap-3 text-2xl text-ui-fg-base"
                          >
                            <Checkbox
                              id={`cat-${sub.id}`}
                              checked={selectedSubs.has(sub.handle)}
                              onCheckedChange={(checked) =>
                                toggleSub(
                                  activeCategory,
                                  sub.handle,
                                  checked === true
                                )
                              }
                            />
                            {sub.name}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>,
    document.body
  )
}

export default CategoryMenuPanel
