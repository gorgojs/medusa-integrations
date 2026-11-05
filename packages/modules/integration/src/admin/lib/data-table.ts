import { useTranslation } from "react-i18next"

/**
 * The pagination labels of a table in the admin's language. `DataTable.Pagination` writes "of",
 * "results", "Prev" and "Next" in English unless it is given them; the keys are the admin's own,
 * the ones Medusa's tables use.
 */
export function usePaginationTranslations() {
  const { t } = useTranslation()
  return {
    of: t("general.of"),
    results: t("general.results"),
    pages: t("general.pages"),
    prev: t("general.prev"),
    next: t("general.next"),
  }
}
