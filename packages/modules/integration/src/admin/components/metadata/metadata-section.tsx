import { ArrowUpRightOnBox } from "@medusajs/icons"
import { Badge, Container, Heading, IconButton } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { Metadata } from "../../lib/metadata"

/** Medusa's metadata card, which @medusajs/dashboard does not export. Uses Medusa's own translations. */
export const MetadataSection = ({ metadata, onEdit }: { metadata: Metadata; onEdit: () => void }) => {
  const { t } = useTranslation()
  const numberOfKeys = metadata ? Object.keys(metadata).length : 0

  return (
    <Container className="flex items-center justify-between">
      <div className="flex items-center gap-x-3">
        <Heading level="h2">{t("metadata.header")}</Heading>
        <Badge size="2xsmall" rounded="full">
          {t("metadata.numberOfKeys", { count: numberOfKeys })}
        </Badge>
      </div>
      <IconButton
        size="small"
        variant="transparent"
        className="text-ui-fg-muted hover:text-ui-fg-subtle"
        aria-label={t("metadata.edit.header")}
        onClick={onEdit}
      >
        <ArrowUpRightOnBox />
      </IconButton>
    </Container>
  )
}
