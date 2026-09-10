import { CalculatorToDoorResult, CalculatorToPointResult } from "../../../lib/apiship-client"
import type { ApishipConnectionDTO } from "../../../types/apiship"
import { findApishipConnection, isTariffAllowed } from "../../../lib/apiship-options"

type CalculatorResponseType = {
  deliveryToDoor?: Array<CalculatorToDoorResult>
  deliveryToPoint?: Array<CalculatorToPointResult>
}

/** The filtered group always has a real (possibly empty) `tariffs` array — never `undefined`. */
type WithTariffs<T> = Omit<T, "tariffs"> & { tariffs: any[] }

function filterGroups<T extends { providerKey?: string; tariffs?: any[] }>(
  groups: T[] | undefined,
  connections: ApishipConnectionDTO[] | undefined,
  stockLocationId: string | undefined,
  deliveryType: number
): WithTariffs<T>[] {
  return (groups ?? [])
    .map((group) => {
      const connection = findApishipConnection(connections, group.providerKey ?? "", stockLocationId)
      return {
        ...group,
        tariffs: (group.tariffs ?? []).filter((tariff) =>
          isTariffAllowed(connection, tariff.tariffId, deliveryType)
        ),
      } as WithTariffs<T>
    })
    .filter((group) => group.tariffs.length > 0)
}

export function filterAllowedTariffs(
  calculatorResponse: CalculatorResponseType,
  connections: ApishipConnectionDTO[] | undefined,
  stockLocationId?: string
): {
  deliveryToDoor: WithTariffs<CalculatorToDoorResult>[]
  deliveryToPoint: WithTariffs<CalculatorToPointResult>[]
} {
  return {
    deliveryToDoor: filterGroups(calculatorResponse.deliveryToDoor, connections, stockLocationId, 1),
    deliveryToPoint: filterGroups(calculatorResponse.deliveryToPoint, connections, stockLocationId, 2),
  }
}
