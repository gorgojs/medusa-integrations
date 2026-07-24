import {
  DropdownMenu,
  IconButton,
  clx,
} from "@medusajs/ui"
import { EllipsisHorizontal } from "@medusajs/icons"
import { Link } from "react-router-dom"

export type Action = {
  icon: React.ReactNode
  label: string
  disabled?: boolean
} & (
    | { to: string; onClick?: never }
    | { onClick: () => void; to?: never}
  )

export type ActionGroup = {
  actions: Action[]
}

export type ActionMenuProps = {
  groups: ActionGroup[]
}

export const ActionMenu = ({ groups }: ActionMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {groups.map((group, groupIdx) => {
          if (!group.actions.length) return null

          const commonItemClasses = "[&_svg]:text-ui-fg-subtle flex items-center gap-x-2"
          const isLastGroup = groupIdx === groups.length - 1

          return (
            <DropdownMenu.Group key={groupIdx}>
              {group.actions.map((action, actionIdx) => {
                const itemClasses = clx(commonItemClasses, {
                  "[&_svg]:text-ui-fg-disabled": action.disabled,
                })

                if (action.onClick) {
                  return (
                    <DropdownMenu.Item
                      disabled={action.disabled}
                      key={actionIdx}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick()
                      }}
                      className={itemClasses}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </DropdownMenu.Item>
                  )
                }

                return (
                  <DropdownMenu.Item
                    key={actionIdx}
                    asChild
                    disabled={action.disabled}
                    className={itemClasses}
                  >
                    <Link to={action.to} onClick={(e) => e.stopPropagation()}>
                      {action.icon}
                      <span>{action.label}</span>
                    </Link>
                  </DropdownMenu.Item>
                )
              })}

              {!isLastGroup && <DropdownMenu.Separator />}
            </DropdownMenu.Group>
          )
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}