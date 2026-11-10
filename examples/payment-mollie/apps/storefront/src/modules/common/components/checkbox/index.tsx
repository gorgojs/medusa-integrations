import { Checkbox, Label } from "@medusajs/ui"
import type React from "react"

type CheckboxProps = {
  checked?: boolean
  onChange?: () => void
  label: string
  name?: string
  'data-testid'?: string
}

const CheckboxWithLabel: React.FC<CheckboxProps> = ({
  checked = true,
  onChange,
  label,
  name,
  'data-testid': dataTestId
}) => {
  return (
    <div className="flex items-center gap-2 ">
      <Checkbox
        className="text-base-regular flex items-center gap-x-2"
        id="checkbox"
        checked={checked}
        onCheckedChange={() => onChange?.()}
        name={name}
        data-testid={dataTestId}
      />
      <Label
        htmlFor="checkbox"
        className="!transform-none !txt-medium"
      >
        {label}
      </Label>
    </div>
  )
}

export default CheckboxWithLabel
