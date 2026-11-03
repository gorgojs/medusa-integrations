import { PuzzleSolid } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"

/**
 * Renders an integration's `icon`. The value is any browser-loadable `<img src>` string —
 * a data URI (the descriptor default), an absolute URL, or a backend-served path. When unset
 * (or the image fails to load) it falls back to a generic mark inside a framed box.
 * `xsmall` is the framed icon of a compact table row; `small` and `base` only size the unframed one.
 */
export const IntegrationIcon = ({
  src,
  alt,
  size = "base",
  framed = true,
}: {
  src?: string | null
  alt?: string
  size?: "xsmall" | "small" | "base"
  framed?: boolean
}) => {
  const dim = size === "small" || size === "xsmall" ? "h-6 w-6" : "h-10 w-10"
  const frame = size === "xsmall" ? "rounded-md w-6 h-6" : "rounded-lg w-12 h-12"
  const [errored, setErrored] = useState(false)
  const showImage = !!src && !errored

  if (showImage && !framed) {
    return (
      <img
        src={src!}
        alt={alt}
        className={clx("shrink-0 object-contain", dim)}
        onError={() => setErrored(true)}
      />
    )
  }

  return (
    <>
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          className={clx("shrink-0 object-cover border shadow-xs", frame)}
          onError={() => setErrored(true)}
        />
      ) : (
        <PuzzleSolid
          className={clx("shrink-0 object-cover border shadow-xs text-ui-fg-subtle", frame, size === "xsmall" ? "p-1" : "p-3")}
        />
      )}
    </>
  )
}
