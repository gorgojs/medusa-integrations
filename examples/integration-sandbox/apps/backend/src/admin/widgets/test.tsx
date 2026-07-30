import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container } from "@medusajs/ui"

const IntegrationListWidget = () => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        Example Widget
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "gorgo.integration.tkassa.after",
})

export default IntegrationListWidget
