import type React from "react"

import type { IconProps } from "types/icon"

/* The YooKassa mark, drawn in the brand blue. The viewBox is cropped to the
   glyph so the icon centres in whatever frame the checkout gives it. */
const YooKassa: React.FC<IconProps> = ({
  size = "16",
  color: _color,
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="73 129 366 254"
      role="img"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <title>YooKassa icon</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M178.511 255.527C178.701 185.824 236.332 129 308.751 129C380.466 129 439.816 186.012 438.992 255.873C438.992 325.733 380.466 382.746 308.751 382.746C237.154 382.746 178.703 326.72 178.511 256.22V350.626H132.35L73 165.938H178.511V255.527ZM260.117 255.873C260.117 281.569 282.373 303.25 308.751 303.25C335.953 303.25 357.385 281.569 357.385 255.873C357.385 230.177 335.129 208.496 308.751 208.496C282.373 208.496 260.117 230.177 260.117 255.873Z"
        fill="#0070F0"
      />
    </svg>
  )
}

export default YooKassa
