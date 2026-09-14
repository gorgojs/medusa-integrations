import { SITE_NAME } from "@lib/util/env"

/**
 * Suffixes a page title with the store name: `Cart | <store name>`. Keeps the
 * separator in one place so every route reads the same in search results and
 * browser tabs. The home page is the exception: its title is the store name on
 * its own, so it uses `SITE_NAME` directly.
 */
export function pageTitle(title: string) {
  return `${title} | ${SITE_NAME}`
}
