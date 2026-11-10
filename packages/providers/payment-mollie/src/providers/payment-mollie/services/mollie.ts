import MollieBase from "../core/mollie-base"
import { ProviderKeys } from "../../../types"

class MollieService extends MollieBase {
  static identifier = ProviderKeys.MOLLIE
}

export default MollieService
