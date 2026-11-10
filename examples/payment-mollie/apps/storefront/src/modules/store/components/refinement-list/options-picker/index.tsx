"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"

import type { ProductOptionFilterGroup } from "@lib/data/products"

const MultiSelect = dynamic(() => import("../multi-select"), {
  ssr: false,
  loading: () => (
    <div className="h-9 w-[180px] max-w-[180px] rounded-md bg-ui-bg-field" />
  ),
})

type OptionsPickerProps = {
  options: ProductOptionFilterGroup[]
  selectedValueIds: string[]
  setOptionValueIds: (valueIds: string[]) => void
}

const OptionsPicker = ({
  options,
  selectedValueIds,
  setOptionValueIds,
}: OptionsPickerProps) => {
  const selectedSet = useMemo(
    () => new Set(selectedValueIds),
    [selectedValueIds]
  )

  if (!options.length) {
    return null
  }

  return (
    <div className="flex flex-row gap-2">
      {options.map((group) => {
        if (!group.values.length) {
          return null
        }

        const groupValueIds = group.values.map((value) => value.id)
        const selectedInGroup = groupValueIds.filter((id) => selectedSet.has(id))

        const setGroupValueIds = (ids: string[]) => {
          const groupIds = new Set(groupValueIds)
          setOptionValueIds([
            ...selectedValueIds.filter((id) => !groupIds.has(id)),
            ...ids,
          ])
        }

        return (
          <MultiSelect
            className="max-w-[180px]"
            key={group.id}
            label={group.title}
            value={selectedInGroup}
            onChange={setGroupValueIds}
            options={group.values.map((value) => ({
              value: value.id,
              label: value.label,
              hex: value.hex,
            }))}
            allowClear={selectedInGroup.length > 0}
          />
        )
      })}
    </div>
  )
}

export default OptionsPicker
