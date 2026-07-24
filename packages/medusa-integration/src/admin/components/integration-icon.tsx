import { PuzzleSolid } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"

/**
 * Renders an integration's descriptor `icon`. The value is any browser-loadable `<img src>`
 * string — a data URI (the default contract, baked into the descriptor), an absolute URL, or
 * a backend-served `/static/…` path. When unset, falls back to a generic mark. Modeled on
 * Medusa's `Thumbnail`: a fixed, rounded, bordered box with a cover-fit image or icon fallback.
 */
export const IntegrationIcon = ({
  src,
  alt,
  size = "base",
}: {
  src?: string | null
  alt?: string
  size?: "small" | "base"
}) => {
  const dim = size === "small" ? "h-6 w-6" : "h-10 w-10"
  const [errored, setErrored] = useState(false)
  return (
    <div
      className={clx(
        "bg-ui-bg-component shadow-borders-base flex shrink-0 items-center justify-center overflow-hidden rounded-md",
        dim
      )}
    >
      {src && !errored ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <PuzzleSolid className="text-ui-fg-subtle" />
      )}
    </div>
  )
}
