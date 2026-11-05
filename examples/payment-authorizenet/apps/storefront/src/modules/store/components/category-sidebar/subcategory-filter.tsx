"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"
import { Checkbox } from "@medusajs/ui"

import {
  SUBCATEGORY_QUERY_KEY,
  parseSubcategoryHandles,
} from "@lib/util/subcategory-filters"

type SubcategoryOption = {
  id: string
  name: string
  handle: string
}

type SubcategoryFilterProps = {
  subcategories: SubcategoryOption[]
}

const SubcategoryFilter = ({ subcategories }: SubcategoryFilterProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selected = useMemo(
    () => new Set(parseSubcategoryHandles(searchParams)),
    [searchParams]
  )

  const toggle = useCallback(
    (handle: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString())
      const next = new Set(parseSubcategoryHandles(searchParams))

      if (checked) {
        next.add(handle)
      } else {
        next.delete(handle)
      }

      params.delete(SUBCATEGORY_QUERY_KEY)
      next.forEach((h) => params.append(SUBCATEGORY_QUERY_KEY, h))
      params.delete("page")

      const queryString = params.toString()
      router.push(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [pathname, router, searchParams]
  )

  if (!subcategories.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 pb-5 border-b border-ui-border-base">
      {subcategories.map((c) => (
        <label
          className="flex items-center gap-2 cursor-pointer"
          htmlFor={c.id}
          key={c.id}
        >
          <Checkbox
            id={c.id}
            checked={selected.has(c.handle)}
            onCheckedChange={(value) => toggle(c.handle, value === true)}
          />
          <span className="txt-compact-small">{c.name}</span>
        </label>
      ))}
    </div>
  )
}

export default SubcategoryFilter
