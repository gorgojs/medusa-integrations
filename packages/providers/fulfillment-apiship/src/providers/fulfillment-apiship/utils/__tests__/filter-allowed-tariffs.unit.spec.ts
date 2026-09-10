import { filterAllowedTariffs } from "../filter-allowed-tariffs"

const makeTariff = (tariffId: number, deliveryCost: number) => ({
  tariffId,
  deliveryCost,
  name: `Tariff ${tariffId}`,
})

describe("filterAllowedTariffs", () => {
  it("keeps every tariff when the connection has no allow-list", () => {
    const response = {
      deliveryToDoor: [
        { providerKey: "cdek", tariffs: [makeTariff(1, 500), makeTariff(2, 300)] },
      ],
    }
    const connections = [
      { id: "c1", provider_key: "cdek", provider_connect_id: "p1", is_enabled: true },
    ]

    const result = filterAllowedTariffs(response, connections)

    expect(result.deliveryToDoor![0]!.tariffs).toHaveLength(2)
  })

  it("drops tariffs not present in the connection's door allow-list", () => {
    const response = {
      deliveryToDoor: [
        { providerKey: "cdek", tariffs: [makeTariff(1, 500), makeTariff(2, 300)] },
      ],
    }
    const connections = [
      {
        id: "c1",
        provider_key: "cdek",
        provider_connect_id: "p1",
        is_enabled: true,
        allowed_door_tariff_ids: ["2"],
      },
    ]

    const result = filterAllowedTariffs(response, connections)

    expect(result.deliveryToDoor![0]!.tariffs.map((t: any) => t.tariffId)).toEqual([2])
  })

  it("drops the whole provider group when none of its tariffs are allowed", () => {
    const response = {
      deliveryToDoor: [{ providerKey: "cdek", tariffs: [makeTariff(1, 500)] }],
    }
    const connections = [
      {
        id: "c1",
        provider_key: "cdek",
        provider_connect_id: "p1",
        is_enabled: true,
        allowed_door_tariff_ids: ["999"],
      },
    ]

    const result = filterAllowedTariffs(response, connections)

    expect(result.deliveryToDoor).toEqual([])
  })

  it("filters deliveryToDoor and deliveryToPoint using independent allow-lists", () => {
    const response = {
      deliveryToDoor: [{ providerKey: "cdek", tariffs: [makeTariff(1, 500)] }],
      deliveryToPoint: [{ providerKey: "cdek", tariffs: [makeTariff(2, 300)] }],
    }
    const connections = [
      {
        id: "c1",
        provider_key: "cdek",
        provider_connect_id: "p1",
        is_enabled: true,
        allowed_door_tariff_ids: ["1"],
        allowed_point_tariff_ids: ["999"],
      },
    ]

    const result = filterAllowedTariffs(response as any, connections)

    expect(result.deliveryToDoor![0]!.tariffs.map((t: any) => t.tariffId)).toEqual([1])
    expect(result.deliveryToPoint).toEqual([])
  })

  it("allows the same tariff id for door but not for point when it appears in both groups", () => {
    // Reproduces a "universal" ApiShip tariff (deliveryType: null) returned under the same
    // tariffId in both deliveryToDoor and deliveryToPoint — restricting one direction must not
    // affect the other.
    const response = {
      deliveryToDoor: [{ providerKey: "cdek", tariffs: [makeTariff(1, 500)] }],
      deliveryToPoint: [{ providerKey: "cdek", tariffs: [makeTariff(1, 500)] }],
    }
    const connections = [
      {
        id: "c1",
        provider_key: "cdek",
        provider_connect_id: "p1",
        is_enabled: true,
        allowed_door_tariff_ids: ["1"],
        allowed_point_tariff_ids: ["999"],
      },
    ]

    const result = filterAllowedTariffs(response as any, connections)

    expect(result.deliveryToDoor![0]!.tariffs.map((t: any) => t.tariffId)).toEqual([1])
    expect(result.deliveryToPoint).toEqual([])
  })

  it("uses the location-specific connection over the fallback when both exist", () => {
    const response = {
      deliveryToDoor: [{ providerKey: "cdek", tariffs: [makeTariff(1, 500), makeTariff(2, 300)] }],
    }
    const connections = [
      {
        id: "c-global",
        provider_key: "cdek",
        provider_connect_id: "p-global",
        is_enabled: true,
        allowed_door_tariff_ids: ["1"],
      },
      {
        id: "c-loc",
        provider_key: "cdek",
        provider_connect_id: "p-loc",
        stock_location_id: "loc-01",
        is_enabled: true,
        allowed_door_tariff_ids: ["2"],
      },
    ]

    const result = filterAllowedTariffs(response, connections, "loc-01")

    expect(result.deliveryToDoor![0]!.tariffs.map((t: any) => t.tariffId)).toEqual([2])
  })

  it("keeps tariffs from a provider with no matching connection unfiltered", () => {
    const response = {
      deliveryToDoor: [{ providerKey: "boxberry", tariffs: [makeTariff(1, 500)] }],
    }

    const result = filterAllowedTariffs(response, [])

    expect(result.deliveryToDoor![0]!.tariffs).toHaveLength(1)
  })
})
