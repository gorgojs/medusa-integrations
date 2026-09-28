import { clx } from "@medusajs/ui"

type ApishipProviderLogoProps = {
  src?: string
  size?: "small" | "base"
}

export const ApishipProviderLogo = ({
  src,
  size = "base",
}: ApishipProviderLogoProps) => {
  if (!src) {
    return null
  }

  return (
    <img
      src={src}
      alt=""
      className={clx(
        "border-ui-border-base shrink-0 rounded-full border",
        size === "small" ? "h-5 w-5" : "h-6 w-6"
      )}
    />
  )
}
