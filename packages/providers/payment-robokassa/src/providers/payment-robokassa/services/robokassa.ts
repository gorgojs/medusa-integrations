import RobokassaBase from "../core/robokassa-base"
import { PaymentOptions, PaymentProviderKeys } from "../types"

class RobokassaService extends RobokassaBase {
  static identifier = PaymentProviderKeys.ROBOKASSA

  constructor(_, options) {
    super(_, options)
  }

  get paymentOptions(): PaymentOptions {
    return {}
  }
}

export default RobokassaService