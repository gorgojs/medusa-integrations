import StripeBase from "../core/stripe-base"
import { ProviderKeys } from "../../../types"

class StripeService extends StripeBase {
  static identifier = ProviderKeys.STRIPE
}

export default StripeService
