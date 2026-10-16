"use client"

import { Button } from "@medusajs/ui"
import type React from "react"
import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  variant = "primary",
  size = "base",
  className,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "transparent" | null
  size?: "small" | "large" | "base" | "xlarge"
  className?: string
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      size={size}
      className={className}
      type="submit"
      isLoading={pending}
      variant={variant || "primary"}
      data-testid={dataTestId}
    >
      {children}
    </Button>
  )
}
