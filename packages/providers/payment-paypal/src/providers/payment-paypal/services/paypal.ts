import PayPalBase from "../core/paypal-base"
import { ProviderKeys } from "../../../types"

class PayPalService extends PayPalBase {
  static identifier = ProviderKeys.PAYPAL
}

export default PayPalService
