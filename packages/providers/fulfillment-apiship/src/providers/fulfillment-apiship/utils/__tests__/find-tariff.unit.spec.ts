import { findTariff } from "../find-tariff"

const response = {
  deliveryToDoor: [
    {
      providerKey: "cdek",
      tariffs: [
        { tariffId: 1, deliveryCost: 500 },
        { tariffId: 1, deliveryCost: 450 },
      ],
    },
  ],
  deliveryToPoint: [
    {
      providerKey: "cdek",
      tariffs: [
        { tariffId: 1792, deliveryCost: 330, pointIds: [10, 11] },
        { tariffId: 1792, deliveryCost: 330, pointIds: [12] },
        { tariffId: 1792, deliveryCost: 310, pointIds: [10, 20, 21] },
        { tariffId: 10674, deliveryCost: 497.63, pointIds: [20, 21] },
      ],
    },
    {
      providerKey: "boxberry",
      tariffs: [{ tariffId: 1792, deliveryCost: 150, pointIds: [20] }],
    },
  ],
}

describe("findTariff", () => {
  it("returns undefined without a chosen tariff id", () => {
    expect(findTariff(response, 2, undefined)).toBeUndefined()
    expect(findTariff(response, 2, { providerKey: "cdek" })).toBeUndefined()
  })

  it("returns undefined for a tariff the calculation does not offer", () => {
    expect(findTariff(response, 2, { providerKey: "cdek", tariffId: 99 })).toBeUndefined()
  })

  it("takes the entry that serves the chosen point when a carrier lists a tariff more than once", () => {
    const tariff = findTariff(response, 2, { providerKey: "cdek", tariffId: 1792 }, "20")

    expect(tariff).toMatchObject({ providerKey: "cdek", tariffId: 1792, deliveryCost: 310 })
  })

  it("keeps the carrier of the chosen tariff when another carrier uses the same tariff id", () => {
    const tariff = findTariff(response, 2, { providerKey: "cdek", tariffId: 1792 }, 20)

    expect(tariff?.providerKey).toBe("cdek")
  })

  it("falls back to the first entry when none serves the chosen point", () => {
    const tariff = findTariff(response, 2, { providerKey: "cdek", tariffId: 1792 }, 99)

    expect(tariff).toMatchObject({ deliveryCost: 330, pointIds: [10, 11] })
  })

  it("takes the first entry when no point is given", () => {
    expect(findTariff(response, 2, { providerKey: "cdek", tariffId: 1792 })).toMatchObject({
      deliveryCost: 330,
    })
  })

  it("ignores the point for a courier tariff", () => {
    expect(findTariff(response, 1, { providerKey: "cdek", tariffId: 1 }, 20)).toMatchObject({
      deliveryCost: 500,
    })
  })
})
