import TkassaBase from "../core/tkassa-base"
import { PaymentOptions, PaymentProviderKeys } from "../types"

class TkassaService extends TkassaBase {
  static identifier = PaymentProviderKeys.TKASSA

  constructor(_, options) {
    super(_, options)
  }

  get paymentOptions(): PaymentOptions {
    return {}
  }
}

export default TkassaService