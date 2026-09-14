import { TriangleRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { Link } from "@i18n/navigation"
type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  ...props
}: InteractiveLinkProps) => {
  return (
    <Link
      className="flex gap-x-1 items-center group"
      href={href}
      onClick={onClick}
      {...props}
    >
      <Text className="text-ui-fg-interactive">{children}</Text>
      <TriangleRightMini
        className="rtl:rotate-180"
        color="var(--fg-interactive)"
      />
    </Link>
  )
}

export default InteractiveLink
