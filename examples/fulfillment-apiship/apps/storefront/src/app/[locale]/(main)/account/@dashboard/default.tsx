import { notFound } from "next/navigation"

/**
 * Next 16 requires a default for every parallel route slot. A path the
 * `@dashboard` slot has no page for is a 404, as it was before the slot needed
 * one.
 */
export default function DashboardDefault() {
  notFound()
}
