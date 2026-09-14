import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import type { HttpTypes } from "@medusajs/types"

const CartTemplate = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  return (
    <div className="overflow-x-hidden lg:py-10">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[7fr_5fr] min-h-[70vh] gap-x-20">
            <div className="flex flex-col py-6 gap-y-6">
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="h-full flex flex-col py-6 gap-y-8">
                <div className="sticky top-0">
                  {cart && cart.region && <Summary cart={cart} />}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
