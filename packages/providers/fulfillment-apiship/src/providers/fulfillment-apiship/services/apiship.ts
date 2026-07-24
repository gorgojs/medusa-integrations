import ApishipBase from "../core/apiship-base"
import { FulfillmentOption } from "@medusajs/framework/types"
import { FulfillmentProviderKeys } from "../../../types/apiship"

class ApishipService extends ApishipBase {
  static identifier = FulfillmentProviderKeys.APISHIP

  constructor(_, options) {
    super(_, options)
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "apiship_doortodoor",
        deliveryType: 1,
        pickupType: 1,
        name: "From door to door",
      },
      {
        id: "apiship_doortopoint",
        deliveryType: 2,
        pickupType: 1,
        name: "From door to pickup point",
      },
      {
        id: "apiship_pointtodoor",
        deliveryType: 1,
        pickupType: 2,
        name: "From pickup point to door",
      },
      {
        id: "apiship_pointtopoint",
        deliveryType: 2,
        pickupType: 2,
        name: "From pickup point to pickup point",
      },
      {
        id: "apiship_return",
        name: "Return",
        is_return: true,
      }
    ]
  }
}

export default ApishipService
