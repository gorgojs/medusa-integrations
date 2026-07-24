import { CalculatorToDoorResult } from "../../../lib/apiship-client"
import { CalculatorToPointResult } from "../../../lib/apiship-client"

type CalculatorResponseType = {
  deliveryToDoor?: Array<CalculatorToDoorResult>
  deliveryToPoint?: Array<CalculatorToPointResult>
}

export function getCheapestTariff(
  calculatorResponse: CalculatorResponseType,
  deliveryType: number
): Record<string, unknown> {
  const deliveryResults = calculatorResponse[deliveryType === 1 ? 'deliveryToDoor' : 'deliveryToPoint']!
  const tariffs = deliveryResults.flatMap(group =>
    (group.tariffs || []).map(tariff => ({
      ...tariff,
      providerKey: group.providerKey,
    }))
  )
  if (!tariffs.length) {
    return {}
  }
  const cheapestTariff = tariffs.reduce((cheapestTariff, tariff) => {
    if (!cheapestTariff) return tariff
    if (tariff.deliveryCost < cheapestTariff.deliveryCost) {
      return tariff
    }
    return cheapestTariff
  }, null)
  return cheapestTariff
}
