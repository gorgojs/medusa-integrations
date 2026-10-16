import type { HttpTypes } from "@medusajs/types"
import type { ComponentType } from "react"

/**
 * What went wrong in a wallet, as a code the row translates. `failed` carries
 * the original error, which the row shows through the shared error messages.
 */
export type ExpressCheckoutError =
  | { code: "noShipping" }
  | { code: "missingContact" }
  | { code: "totalChanged"; total: number; currency_code: string }
  | { code: "failed"; cause?: unknown }

/** Props every express button receives from the row. */
export type ExpressButtonProps = {
  cart: HttpTypes.StoreCart
  /** The payment provider of the button, as enabled in the cart's region. */
  providerId: string
  /** The shipping option the checkout has selected, for the wallet's first quote. */
  shippingOptionId: string | null
  /** The wallet is not available to this customer, so the row hides the button. */
  onUnavailable: () => void
  onError: (error: ExpressCheckoutError | null) => void
  /** True while the wallet's payment turns into an order. */
  onBusy: (busy: boolean) => void
  /** Places the order once the wallet has paid. A placed order redirects. */
  placeOrder: () => Promise<void>
  /**
   * The wallet's window closed without an order. The cart may now hold the
   * wallet's address, so the row refreshes the checkout.
   */
  onClosed: () => void
}

/**
 * Express buttons above the checkout, one entry per payment provider. The row
 * shows an entry only when `match` accepts a provider enabled in the cart's
 * region. The starter ships without entries, so the row renders nothing until a
 * payment plugin's button is added here.
 */
export const expressButtons: {
  match: (providerId: string) => boolean
  Component: ComponentType<ExpressButtonProps>
}[] = []
