const VK = ({
  className,
  size = 24,
}: {
  className?: string
  size?: number
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21.6729 30.0361C10.5523 30.0361 3.8034 22.4951 3.54102 9.96411H9.17336C9.34894 19.1691 13.6339 23.0755 16.9186 23.8718V9.96411H22.3183V17.9062C25.4864 17.563 28.8009 13.9496 29.9173 9.96411H35.2261C34.3758 14.8674 30.7676 18.4807 28.215 19.9711C30.7676 21.1762 34.8749 24.3307 36.4591 30.0361H30.6216C29.3886 26.2222 26.3665 23.2683 22.3183 22.8673V30.0361H21.6729Z"
      fill="#52525B"
    />
  </svg>
)

export default VK
