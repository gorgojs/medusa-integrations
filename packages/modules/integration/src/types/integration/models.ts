import type { InferTypeOf } from "@medusajs/framework/types"
import type IntegrationModel from "../../modules/integration/models/integration"
import type IntegrationChangeModel from "../../modules/integration/models/integration-change"

/** A stored integration record, as the generated methods of the module's service return it. */
export type Integration = InferTypeOf<typeof IntegrationModel>

/** A stored record of the settings change history. */
export type IntegrationChange = InferTypeOf<typeof IntegrationChangeModel>
