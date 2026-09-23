import type { Metadata } from "next"
import { Suspense } from "react"

import { getPromoBannerDismissed } from "@lib/data/cookies"
import { getBaseURL } from "@lib/util/env"
import BottomNav from "@modules/layout/components/bottom-nav"
import CartNotifications from "@modules/layout/components/cart-notifications"
import PromoBanner from "@modules/layout/components/promo-banner"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  // Only the promo-banner cookie is read here — it is a cookie lookup, not a
  // fetch. Everything that talks to the backend lives behind a <Suspense>
  // boundary so it cannot delay the page content below.
  const promoBannerDismissed = await getPromoBannerDismissed()

  return (
    <>
      <PromoBanner dismissed={promoBannerDismissed} />
      <Nav />
      <div className="pb-16 lg:pb-0">
        <Suspense fallback={null}>
          <CartNotifications />
        </Suspense>
        {props.children}
        <Footer />
      </div>
      <BottomNav />
    </>
  )
}
