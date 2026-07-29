import TkassaBase from "../core/tkassa-base"
import { PaymentOptions } from "../types"
import { ProviderKeys } from "../../../types"


class TkassaService extends TkassaBase {
  static identifier = ProviderKeys.TKASSA

  constructor(_, options) {
    super(_, options)
  }

  get paymentOptions(): PaymentOptions {
    return {}
  }
}

export default TkassaService
