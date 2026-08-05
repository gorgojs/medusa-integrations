import { Copy, Heading, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { parseMarkdown } from "../../lib/markdown/parse"
import type { MdBlock, MdInline } from "../../lib/markdown/types"

/**
 * Maps parser nodes to Medusa UI. Deliberately decision-free: it cannot reject a
 * link or truncate content, because only validated nodes ever reach it. All
 * security rules live in src/lib/markdown/.
 */
const Inline = ({ nodes }: { nodes: MdInline[] }) => (
  <>
    {nodes.map((node, i) => {
      switch (node.type) {
        case "text":
          return <span key={i}>{node.value}</span>
        case "code":
          return (
            <code key={i} className="txt-compact-small bg-ui-bg-component rounded px-1 py-0.5">
              {node.value}
            </code>
          )
        case "strong":
          return (
            <span key={i} className="txt-compact-small-plus">
              <Inline nodes={node.children} />
            </span>
          )
        case "em":
          return (
            <em key={i}>
              <Inline nodes={node.children} />
            </em>
          )
        case "link":
          return (
            <a
              key={i}
              href={node.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui-fg-interactive hover:underline"
            >
              <Inline nodes={node.children} />
            </a>
          )
      }
    })}
  </>
)

const Block = ({ block, truncatedLabel }: { block: MdBlock; truncatedLabel: string }) => {
  switch (block.type) {
    case "heading":
      return (
        <Heading level={block.level === 2 ? "h2" : "h3"}>
          <Inline nodes={block.children} />
        </Heading>
      )
    case "paragraph":
      return (
        <Text size="small" className="text-ui-fg-subtle">
          <Inline nodes={block.children} />
        </Text>
      )
    case "list": {
      const List = block.ordered ? "ol" : "ul"
      return (
        <List
          className={`text-ui-fg-subtle txt-small flex flex-col gap-y-1 pl-5 ${
            block.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline nodes={item} />
            </li>
          ))}
        </List>
      )
    }
    case "codeBlock":
      return (
        <div className="bg-ui-bg-subtle flex flex-col gap-y-2 rounded-md px-3 pb-1 pt-2">
          <div className="flex items-center justify-between gap-x-2">
            {block.label ? (
              <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                {block.label}
              </Text>
            ) : (
              <span />
            )}
            <Copy content={block.value} />
          </div>
          <pre className="txt-compact-small text-ui-fg-subtle overflow-x-auto whitespace-pre pb-2">
            {block.value}
          </pre>
        </div>
      )
    case "hr":
      return <div className="border-ui-border-base border-t" />
    case "truncated":
      return (
        <Text size="small" className="text-ui-fg-muted">
          {truncatedLabel}
        </Text>
      )
  }
}

export const Markdown = ({
  source,
  truncatedLabel,
}: {
  source: string
  truncatedLabel: string
}) => {
  const blocks = useMemo(() => parseMarkdown(source), [source])
  if (!blocks.length) return null
  return (
    <div className="flex flex-col gap-y-4">
      {blocks.map((block, i) => (
        <Block key={i} block={block} truncatedLabel={truncatedLabel} />
      ))}
    </div>
  )
}
