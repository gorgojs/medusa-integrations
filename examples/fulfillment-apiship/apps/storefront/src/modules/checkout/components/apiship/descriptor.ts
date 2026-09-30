import type { ShippingOptionDescriptor } from "@lib/constants"
import { removeApishipShippingMethod } from "@lib/data/apiship"
import {
  getApishipSelection,
  isApishipOption,
  isApishipSelectionComplete,
} from "./utils"

export const apishipShippingOptionDescriptor: ShippingOptionDescriptor = {
  test: isApishipOption,
  // ApiShip attaches with the cheapest tariff it found, which is enough to price the
  // cart but not to ship it: the order needs the tariff the customer actually picked,
  // and a pickup point where the option delivers to one.
  isReady: (cart, option) =>
    isApishipSelectionComplete(getApishipSelection(cart, option.id), option),
  pricedByChoice: true,
  removeShippingMethod: removeApishipShippingMethod,
}
