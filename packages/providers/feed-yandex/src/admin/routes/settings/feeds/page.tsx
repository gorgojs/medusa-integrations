import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Rss } from "@medusajs/icons"
import {
  Container,
  useToggleState,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { SingleColumnLayout } from "../../../components/layout"
import { FeedListTable, FeedCreateModal } from "../../../components/routes/feeds/feed-list"

const FeedsPage = () => {
  const [stateModal, openModal, closeModal] = useToggleState()
  return (
    <SingleColumnLayout>
      <Container className="p-0">
        <FeedListTable stateModal={stateModal} openModal={openModal} />
        <FeedCreateModal stateModal={stateModal} closeModal={closeModal} />
      </Container>
    </SingleColumnLayout>
  )
}

const FeedsBreadcrumb = () => {
  const { t } = useTranslation("gorgo")
  return <>{t("feedYandex.feeds.domain")}</>
}

export const config = defineRouteConfig({
  label: "feedYandex.feeds.domain",
  translationNs: "gorgo",
  icon: Rss,
})

export const handle = {
  breadcrumb: () => <FeedsBreadcrumb />,
}

export default FeedsPage
