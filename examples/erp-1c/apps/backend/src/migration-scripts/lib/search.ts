import type { MedusaContainer } from "@medusajs/framework";
import { logger } from "@medusajs/framework/logger";
import { Modules } from "@medusajs/framework/utils";

/**
 * Rebuilds the product search index once the catalog is in place.
 *
 * The seed creates products first and their options, collections and
 * translations after, and the events those steps emit are asynchronous, so the
 * process can end before they reach the index. Booting the server later doesn't
 * help either: it only fills an index that is empty.
 *
 * A failure is logged rather than thrown, so a database without the search
 * extensions still gets a seeded store. Rebuild the index later from the Admin
 * or with `POST /admin/search-indexes/product/reindex`.
 */
export const reindexSearch = async (container: MedusaContainer) => {
  try {
    const search = container.resolve(Modules.SEARCH);
    await search.reindex({ index: "product" });
  } catch (error) {
    logger.warn(
      `Could not rebuild the product search index: ${(error as Error).message}`,
    );
  }
};
