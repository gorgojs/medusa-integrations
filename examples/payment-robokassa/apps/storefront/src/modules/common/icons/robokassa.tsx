import type React from "react"

import type { IconProps } from "types/icon"

/* The Robokassa arrow. The brand puts it in white on a dark square; on the
   light frame the checkout draws, the dark mark on its own reads better. */
const Robokassa: React.FC<IconProps> = ({
  size = "16",
  color: _color,
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="54 129 404 254"
      role="img"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <title>Robokassa icon</title>
      <path d="M239 129L54 383H274L458 129H239Z" fill="#333339" />
    </svg>
  )
}

export default Robokassa
