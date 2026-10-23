import { TriangleRightMini } from "@medusajs/icons"
import { Link } from "@i18n/navigation"

export type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbProps = {
  items: BreadcrumbItem[]
}

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <nav className="flex items-center gap-1 text-sm text-ui-fg-muted mb-8 flex-wrap">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <TriangleRightMini />}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-ui-fg-base transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-ui-fg-base">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export default Breadcrumb
