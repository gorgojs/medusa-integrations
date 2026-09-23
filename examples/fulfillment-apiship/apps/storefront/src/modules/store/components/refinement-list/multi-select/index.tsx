"use client"

import {
  Combobox as PrimitiveCombobox,
  ComboboxDisclosure as PrimitiveComboboxDisclosure,
  ComboboxItem as PrimitiveComboboxItem,
  ComboboxItemCheck as PrimitiveComboboxItemCheck,
  ComboboxItemValue as PrimitiveComboboxItemValue,
  ComboboxPopover as PrimitiveComboboxPopover,
  ComboboxProvider as PrimitiveComboboxProvider,
} from "@ariakit/react"
import { CheckMini, XMarkMini } from "@medusajs/icons"
import ChevronDown from "@modules/common/icons/chevron-down"
import { clx, Text } from "@medusajs/ui"
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"

type MultiSelectOption = {
  value: string
  label: string
  hex?: string
  disabled?: boolean
}

interface MultiSelectProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  options: MultiSelectOption[]
  allowClear?: boolean
}

const TABULAR_NUM_WIDTH = 8
const TAG_BASE_WIDTH = 28

const MultiSelectImpl = (
  {
    label,
    value,
    onChange,
    options,
    className,
    allowClear = true,
    ...inputProps
  }: MultiSelectProps,
  ref: ForwardedRef<HTMLInputElement>
) => {
  const [open, setOpen] = useState(false)

  const comboboxRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => comboboxRef.current as HTMLInputElement)

  const hasValue = value.length > 0

  const tagWidth = useMemo(() => {
    const digits = value.length.toString().length

    return TAG_BASE_WIDTH + digits * TABULAR_NUM_WIDTH
  }, [value.length])

  return (
    <PrimitiveComboboxProvider
      open={open}
      setOpen={setOpen}
      selectedValue={value}
      setSelectedValue={(nextValue: string | string[]) =>
        onChange((nextValue as string[]) ?? [])
      }
      value=""
      setValue={() => undefined}
    >
      <div
        className={clx(
          "relative flex cursor-pointer items-center gap-x-2 overflow-hidden",
          "h-8 w-full rounded-md",
          "bg-ui-bg-base transition-fg shadow-borders-base",
          "has-[input:focus]:shadow-borders-interactive-with-active",
          className
        )}
        style={
          {
            "--tag-width": `${tagWidth}px`,
          } as CSSProperties
        }
      >
        {hasValue && allowClear && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              onChange([])
            }}
            className="bg-ui-bg-base hover:bg-ui-bg-base-hover txt-compact-small-plus text-ui-fg-subtle focus-within:border-ui-fg-interactive transition-fg absolute start-0.5 top-0.5 z-[1] flex h-[28px] items-center rounded-[4px] border py-[3px] pe-1 ps-1.5 outline-none"
          >
            <span className="tabular-nums">{value.length}</span>
            <XMarkMini className="text-ui-fg-muted" />
          </button>
        )}

        <div className="relative flex size-full items-center">
          <div
            className={clx(
              "pointer-events-none absolute inset-y-0 flex size-full items-center overflow-hidden",
              {
                "start-[calc(var(--tag-width)+8px)]": hasValue,
                "start-2": !hasValue,
              }
            )}
          >
            <Text size="small" leading="compact" className="truncate">
              {label}
            </Text>
          </div>

          <PrimitiveCombobox
            autoSelect
            ref={comboboxRef}
            readOnly
            value=""
            onFocus={() => setOpen(true)}
            className={clx(
              "txt-compact-small text-ui-fg-base transition-fg size-full cursor-pointer bg-transparent pe-8 ps-2 outline-none",
              "hover:bg-ui-bg-base-hover opacity-0",
              {
                "ps-2": !hasValue,
                "ps-[calc(var(--tag-width)+8px)]": hasValue,
              }
            )}
            aria-label={label}
            {...inputProps}
          />
        </div>

        <PrimitiveComboboxDisclosure
          render={(props: ComponentPropsWithoutRef<"button">) => {
            return (
              <button
                {...props}
                type="button"
                aria-label={label}
                className="text-ui-fg-muted transition-fg hover:bg-ui-bg-base-hover absolute end-0 flex size-8 items-center justify-center rounded-e outline-none"
              >
                <ChevronDown
                  className={clx("transition-transform duration-200", {
                    "rotate-180 transform": open,
                  })}
                />
              </button>
            )
          }}
        />
      </div>

      <PrimitiveComboboxPopover
        gutter={4}
        sameWidth
        ref={listboxRef}
        role="listbox"
        className={clx(
          "shadow-elevation-flyout bg-ui-bg-base z-50 rounded-[8px] p-1",
          "max-h-[200px] overflow-y-auto",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2"
        )}
        style={{
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {options.map(({ value, label, hex, disabled }) => (
          <PrimitiveComboboxItem
            key={value}
            value={value}
            focusOnHover
            setValueOnClick={false}
            disabled={disabled}
            className={clx(
              "transition-fg bg-ui-bg-base data-[active-item=true]:bg-ui-bg-base-hover group flex cursor-pointer items-center gap-x-2 rounded-[4px] px-2 py-1",
              {
                "text-ui-fg-disabled": disabled,
                "bg-ui-bg-component": disabled,
              }
            )}
          >
            <PrimitiveComboboxItemCheck className="flex !size-5 items-center justify-center">
              <CheckMini />
            </PrimitiveComboboxItemCheck>
            {hex && (
              <span
                className="size-3 shrink-0 rounded-full inline-block border border-ui-border-base"
                style={{ backgroundColor: hex }}
              />
            )}
            <PrimitiveComboboxItemValue className="txt-compact-small">
              {label}
            </PrimitiveComboboxItemValue>
          </PrimitiveComboboxItem>
        ))}
      </PrimitiveComboboxPopover>
    </PrimitiveComboboxProvider>
  )
}

const MultiSelect = forwardRef(MultiSelectImpl)

export type { MultiSelectOption, MultiSelectProps }
export default MultiSelect
