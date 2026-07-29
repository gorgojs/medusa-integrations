import RobokassaBase from "../core/robokassa-base"
import { PaymentOptions } from "../types"
import { ProviderKeys } from "../../../types"

class RobokassaService extends RobokassaBase {
  static identifier = ProviderKeys.ROBOKASSA

  constructor(_, options) {
    super(_, options)
  }

  get paymentOptions(): PaymentOptions {
    return {}
  }
}

export default RobokassaService
