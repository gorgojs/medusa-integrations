import { LoaderFunctionArgs, UIMatch } from "react-router-dom"

import { sdk } from "../../../../lib/sdk"
import { TwoColumnLayout } from "../../../../components/layout"
import type { FeedResponse } from "../../../../types"
import {
  ProductCategoriesSection,
  FeedGeneralSection,
  ShopSettingsSection,
} from "../../../../components/routes/feeds/feed-detail"
import { I18n } from "../../../../components/utilities/i18n"

const FeedDetailsPage = () => (
  <>
    <I18n />
    <TwoColumnLayout
      firstCol={
        <>
          <FeedGeneralSection />
          <ProductCategoriesSection />
        </>
      }
      secondCol={
        <ShopSettingsSection />
      }
    />
  </>
)

const Breadcrumb = (
  props: UIMatch<FeedResponse>
) => {
  // React Router v7 deprecates `UIMatch.data` in favour of `loaderData`; v6 only has `data`
  const feed = (props.loaderData ?? props.data)?.feed
  if (!feed)
    return null

  return <span>{feed.title}</span>
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { id } = params
  const response = await sdk.client.fetch(`/admin/feeds/${id}`)
  return response
}

export const handle = {
  breadcrumb: (match: UIMatch<FeedResponse>) => <Breadcrumb {...match} />,
}

export default FeedDetailsPage
