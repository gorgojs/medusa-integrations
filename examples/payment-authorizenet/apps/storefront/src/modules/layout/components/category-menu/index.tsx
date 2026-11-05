"use client"

import { BarsThree } from "@medusajs/icons"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import type { HttpTypes } from "@medusajs/types"
import useScrollLock from "@lib/hooks/use-scroll-lock"

/**
 * The panel carries the whole Framer Motion runtime, which is ~70 KB of the
 * client bundle for an overlay nobody has opened yet. It loads on the first
 * open and then stays mounted, so every later close still animates out.
 */
const CategoryMenuPanel = dynamic(() => import("./menu-panel"), { ssr: false })

type CategoryMenuProps = {
  categories: HttpTypes.StoreProductCategory[]
  className?: string
}

const CategoryMenu = ({ categories, className }: CategoryMenuProps) => {
  const t = useTranslations("CategoryMenu")

  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => setMounted(true), [])

  useScrollLock(isOpen)

  const open = () => {
    setHasOpened(true)
    setIsOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t("title")}
        className={className}
      >
        <BarsThree />
      </button>

      {mounted && hasOpened && (
        <CategoryMenuPanel
          categories={categories}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default CategoryMenu
