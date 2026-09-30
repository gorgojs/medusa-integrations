import type React from "react"

import type { IconProps } from "types/icon"

const Clock: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        d="M10.0003 17.5C14.1425 17.5 17.5003 14.1421 17.5003 10C17.5003 5.85786 14.1425 2.5 10.0003 2.5C5.85819 2.5 2.50033 5.85786 2.50033 10C2.50033 14.1421 5.85819 17.5 10.0003 17.5Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 5.83337V10L12.5 11.6667"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default Clock
