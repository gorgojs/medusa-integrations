import YookassaBase from "../core/yookassa-base"
import { PaymentOptions, PaymentProviderKeys } from "../types"

class YookassaService extends YookassaBase {
  static identifier = PaymentProviderKeys.YOOKASSA

  constructor(_, options) {
    super(_, options)
  }

  get paymentOptions(): PaymentOptions {
    return {}
  }
}

export default YookassaService
