import { revalidatePath, revalidateTag } from "next/cache"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret")

  if (
    process.env.REVALIDATE_SECRET &&
    secret !== process.env.REVALIDATE_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  if (
    body.type === "product.updated" ||
    body.type === "product.created" ||
    body.type === "product.deleted" ||
    body.type === "product-variant.updated" ||
    body.type === "product-variant.created" ||
    body.type === "product-variant.deleted" ||
    body.type === "product-tag.updated" ||
    body.type === "product-tag.created" ||
    body.type === "product-tag.deleted" ||
    body.type === "product-option.updated" ||
    body.type === "product-option.created" ||
    body.type === "product-option.deleted"
  ) {
    revalidateTag("products")
    revalidatePath(`/[locale]/(main)/products/[handle]`, "page")
    revalidatePath(`/[locale]/(main)/store`, "page")
    revalidatePath(`/[locale]/(main)/categories/[...category]`, "page")
    revalidatePath(`/[locale]/(main)/collections/[handle]`, "page")
    revalidatePath("/llms.txt")
    revalidatePath("/sitemap.xml")
  }

  if (
    body.type === "product-category.updated" ||
    body.type === "product-category.created" ||
    body.type === "product-category.deleted"
  ) {
    revalidateTag("categories")
    revalidatePath(`/[locale]/(main)/products/[handle]`, "page")
    revalidatePath(`/[locale]/(main)/store`, "page")
    revalidatePath(`/[locale]/(main)/categories/[...category]`, "page")
    revalidatePath(`/[locale]/(main)/collections/[handle]`, "page")
    revalidatePath("/llms.txt")
    revalidatePath("/sitemap.xml")
  }

  if (
    body.type === "product-collection.updated" ||
    body.type === "product-collection.created" ||
    body.type === "product-collection.deleted"
  ) {
    revalidateTag("collections")
    revalidatePath(`/[locale]/(main)/collections/[handle]`, "page")
    revalidatePath(`/[locale]/(main)/store`, "page")
    revalidatePath("/llms.txt")
    revalidatePath("/sitemap.xml")
  }

  if (
    body.type === "translation.created" ||
    body.type === "translation.updated" ||
    body.type === "translation.deleted"
  ) {
    revalidateTag("products")
    revalidateTag("categories")
    revalidateTag("collections")
    revalidatePath(`/[locale]/(main)/products/[handle]`, "page")
    revalidatePath(`/[locale]/(main)/store`, "page")
    revalidatePath(`/[locale]/(main)/categories/[...category]`, "page")
    revalidatePath(`/[locale]/(main)/collections/[handle]`, "page")
    revalidatePath("/llms.txt")
    revalidatePath("/sitemap.xml")
  }

  return NextResponse.json({ revalidated: true })
}
