import { Heading, Button, Text, StatusBadge } from "@medusajs/ui"
import React from "react"
import { Link, LinkProps } from "react-router-dom"
import { ActionMenu, ActionMenuProps } from "./action-menu"

type Status = {
  color: "grey" | "red" | "green" | "blue" | "orange" | "purple"
  text: string
}

type ButtonAction = {
  type: "button"
  props: React.ComponentProps<typeof Button>
  link?: LinkProps
}

type ActionMenuAction = {
  type: "action-menu"
  props: ActionMenuProps
}

type CustomAction = {
  type: "custom"
  children: React.ReactNode
}

type Action = ButtonAction | ActionMenuAction | CustomAction

export type HeadingProps = {
  title: string
  subtitle?: string
  status?: Status
  actions?: Action[]
}

export const Header = ({
  title,
  subtitle,
  status,
  actions = [],
}: HeadingProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <Heading level="h2">{title}</Heading>
        {subtitle && (
          <Text className="text-ui-fg-subtle" size="small">
            {subtitle}
          </Text>
        )}
      </div>

      {(status || actions.length > 0) && (
        <div className="flex items-center justify-center gap-x-2">
          {status && (
            <StatusBadge color={status.color}>
              {status.text}
            </StatusBadge>
          )}

          {actions.map((action, idx) => {
            switch (action.type) {
              case "button":
                return action.link ? (
                  <Link key={idx} {...action.link}>
                    <Button
                      {...action.props}
                      size={action.props.size || "small"}
                    />
                  </Link>
                ) : (
                  <Button
                    key={idx}
                    {...action.props}
                    size={action.props.size || "small"}
                  />
                )

              case "action-menu":
                return <ActionMenu key={idx} {...action.props} />

              case "custom":
                return <React.Fragment key={idx}>{action.children}</React.Fragment>

              default:
                return null
            }
          })}
        </div>
      )}
    </div>
  )
}
