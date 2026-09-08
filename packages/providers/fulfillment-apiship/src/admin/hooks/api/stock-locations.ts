import { useQuery } from "@tanstack/react-query"
import type { HttpTypes } from "@medusajs/framework/types"
import { sdk } from "../../lib/sdk"

export const useStockLocations = () => {
  const { data, ...rest } = useQuery<HttpTypes.AdminStockLocationListResponse>({
    queryKey: ["apiship-stock-locations"],
    queryFn: () => sdk.admin.stockLocation.list({ limit: 999 }),
  })

  return {
    stockLocations: data?.stock_locations ?? [],
    ...rest,
  }
}
