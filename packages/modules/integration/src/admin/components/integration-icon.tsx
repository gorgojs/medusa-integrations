import { PuzzleSolid } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"

/**
 * Renders an integration's `icon`. The value is any browser-loadable `<img src>` string —
 * a data URI (the descriptor default), an absolute URL, or a backend-served path. When unset
 * (or the image fails to load) it falls back to a generic mark inside a framed box.
 */
export const IntegrationIcon = ({
  src,
  alt,
  size = "base",
  framed = true,
}: {
  src?: string | null
  alt?: string
  size?: "small" | "base"
  framed?: boolean
}) => {
  const dim = size === "small" ? "h-6 w-6" : "h-10 w-10"
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
          className="rounded-lg object-cover border shadow-xs w-12 h-12"
          onError={() => setErrored(true)}
        />
      ) : (
        <PuzzleSolid className="rounded-lg object-cover border shadow-xs w-12 h-12 p-3 text-ui-fg-subtle" />
      )}
    </>
  )
}
