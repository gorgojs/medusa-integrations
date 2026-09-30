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
  chosen: ChosenTariff | undefined | null,
  pointId?: unknown
): FoundTariff | undefined {
  if (!chosen || chosen.tariffId === undefined || chosen.tariffId === null) {
    return undefined
  }

  const groups = (deliveryType === 2
    ? calculatorResponse.deliveryToPoint
    : calculatorResponse.deliveryToDoor) as Array<{ providerKey?: string; tariffs?: any[] }> | undefined

  const candidates: FoundTariff[] = []

  for (const group of groups ?? []) {
    if (!group.providerKey) continue
    if (chosen.providerKey !== undefined && chosen.providerKey !== group.providerKey) continue

    for (const candidate of group.tariffs ?? []) {
      if (String(candidate.tariffId) === String(chosen.tariffId)) {
        candidates.push({ ...candidate, providerKey: group.providerKey })
      }
    }
  }

  const servesPoint = (tariff: FoundTariff) =>
    (tariff.pointIds ?? []).some((id) => String(id) === String(pointId))

  if (deliveryType === 2 && pointId !== undefined && pointId !== null) {
    return candidates.find(servesPoint) ?? candidates[0]
  }

  return candidates[0]
}
