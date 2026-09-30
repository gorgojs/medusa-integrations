import { CalculatorToDoorResult, CalculatorToPointResult } from "../../../lib/apiship-client"

type CalculatorResponseType = {
  deliveryToDoor?: Array<CalculatorToDoorResult>
  deliveryToPoint?: Array<CalculatorToPointResult>
}

export type ChosenTariff = {
  providerKey?: unknown
  tariffId?: unknown
}

export type FoundTariff = Record<string, any> & {
  providerKey: string
  tariffId: number
  deliveryCost?: number
  pointIds?: number[]
}

export function findTariff(
  calculatorResponse: CalculatorResponseType,
  deliveryType: number,
  chosen: ChosenTariff | undefined | null
): FoundTariff | undefined {
  if (!chosen || chosen.tariffId === undefined || chosen.tariffId === null) {
    return undefined
  }

  const groups = (deliveryType === 2
    ? calculatorResponse.deliveryToPoint
    : calculatorResponse.deliveryToDoor) as Array<{ providerKey?: string; tariffs?: any[] }> | undefined

  for (const group of groups ?? []) {
    if (!group.providerKey) continue
    if (chosen.providerKey !== undefined && chosen.providerKey !== group.providerKey) continue

    const tariff = (group.tariffs ?? []).find(
      (candidate) => String(candidate.tariffId) === String(chosen.tariffId)
    )
    if (tariff) {
      return { ...tariff, providerKey: group.providerKey }
    }
  }

  return undefined
}
