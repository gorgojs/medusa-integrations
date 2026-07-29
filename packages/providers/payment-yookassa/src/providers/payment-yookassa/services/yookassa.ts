import YookassaBase from "../core/yookassa-base"
import { PaymentOptions } from "../types"
import { ProviderKeys } from "../../../types"

class YookassaService extends YookassaBase {
  static identifier = ProviderKeys.YOOKASSA

  constructor(_, options) {
    super(_, options)
  }

  get paymentOptions(): PaymentOptions {
    return {}
  }
}

export default YookassaService
