import type { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import {
  getOptionValueHex,
  isColorOption,
  sortOptionValues,
} from "@lib/util/color-option"
import type React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const optionValues = sortOptionValues(option.values ?? [])
  const isColor = isColorOption(option)

  return (
    <div className="flex flex-col gap-y-2">
      <span className="txt-large text-ui-fg-base">{title}</span>
      <div
        className={clx(
          isColor
            ? "flex flex-wrap"
            : "grid grid-cols-[repeat(auto-fit,_minmax(70px,_1fr))]",
          "gap-2 max-w-md"
        )}
        data-testid={dataTestId}
      >
        {optionValues.map((optionValue) => {
          const value = optionValue.value
          const isSelected = value === current
          const hex = getOptionValueHex(optionValue)

          if (isColor && hex) {
            return (
              <button
                key={value}
                onClick={() => updateOption(option.id, value)}
                disabled={disabled}
                title={value}
                data-testid="option-button"
                className={clx(
                  "w-10 h-10 rounded-lg transition-all border-4 border-ui-bg-component",
                  isSelected
                    ? "ring-1 ring-ui-border-interactive"
                    : "hover:ring-1 hover:ring-ui-bg-subtle"
                )}
                style={{ backgroundColor: hex }}
              />
            )
          }

          return (
            <button
              key={value}
              onClick={() => updateOption(option.id, value)}
              disabled={disabled}
              data-testid="option-button"
              className={clx(
                "w-full h-10 rounded-lg text-xs transition-all bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover border border-ui-bg-component text-ui-fg-base",
                isSelected
                  ? "ring-1 ring-ui-border-interactive"
                  : "hover:ring-1 hover:ring-ui-border-base"
              )}
            >
              {value}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
