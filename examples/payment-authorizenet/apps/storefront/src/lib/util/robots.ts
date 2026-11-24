import type { Metadata } from "next"

export const NOINDEX: Metadata["robots"] = { index: false, follow: false }

/** Kept out of the index, while the links on the page are still crawled. */
export const NOINDEX_FOLLOW: Metadata["robots"] = { index: false, follow: true }
