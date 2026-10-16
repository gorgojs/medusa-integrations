import { retrieveCart } from "@lib/data/cart"
import CartTemplate from "@modules/cart/templates"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { pageTitle } from "@lib/util/page-title"
import { NOINDEX } from "@lib/util/robots"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.cart")

  return {
    title: pageTitle(t("title")),
    description: t("description"),
    robots: NOINDEX,
  }
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  return <CartTemplate cart={cart} />
}
