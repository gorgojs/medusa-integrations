import { clx } from "@medusajs/ui"
import Image from "next/image"

type ProviderLogoProps = {
  src?: string
  className?: string
}

export default function ProviderLogo({ src, className }: ProviderLogoProps) {
  if (!src) return null

  return (
    <Image
      src={src}
      alt=""
      width={24}
      height={24}
      className={clx(
        "h-6 w-6 shrink-0 rounded-full shadow-borders-base",
        className
      )}
    />
  )
}
