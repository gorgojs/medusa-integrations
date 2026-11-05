import AuthorizeNetBase from "../core/authorizenet-base"
import { ProviderKeys } from "../../../types"

class AuthorizeNetService extends AuthorizeNetBase {
  static identifier = ProviderKeys.AUTHORIZENET
}

export default AuthorizeNetService
