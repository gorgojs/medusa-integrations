import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Rss } from "@medusajs/icons"
import { ApishipDetail } from "../../../components/routes/apiship/apiship-detail"

const ApishipPage = () => {
  return (
    <ApishipDetail />
  )
}

export const config = defineRouteConfig({
  label: "ApiShip",
  icon: Rss,
})

export const handle = {
  breadcrumb: () => "ApiShip",
}

export default ApishipPage