import { getCheapestTariff } from "../get-cheapest-tariff"

const makeTariff = (tariffId: number, deliveryCost: number) => ({
  tariffId,
  deliveryCost,
  name: `Tariff ${tariffId}`,
})

describe("getCheapestTariff", () => {
  describe("deliveryType=1 (deliveryToDoor)", () => {
    it("returns the tariff with the lowest deliveryCost", () => {
      const response = {
        deliveryToDoor: [
          {
            providerKey: "cdek",
            tariffs: [
              makeTariff(1, 500),
              makeTariff(2, 300),
              makeTariff(3, 400),
            ],
          },
        ],
      }

      const result = getCheapestTariff(response, 1)

      expect(result).toMatchObject({ tariffId: 2, deliveryCost: 300 })
    })

    it("spreads providerKey from the group onto each tariff", () => {
      const response = {
        deliveryToDoor: [
          { providerKey: "cdek", tariffs: [makeTariff(1, 200)] },
        ],
      }

      const result = getCheapestTariff(response, 1)

      expect((result as any).providerKey).toBe("cdek")
    })

    it("returns empty object when deliveryToDoor has no tariffs", () => {
      const response = {
        deliveryToDoor: [{ providerKey: "cdek", tariffs: [] }],
      }

      const result = getCheapestTariff(response, 1)

      expect(result).toEqual({})
    })

    it("returns empty object when deliveryToDoor is empty array", () => {
      const response = { deliveryToDoor: [] }

      const result = getCheapestTariff(response, 1)

      expect(result).toEqual({})
    })

    it("selects cheapest across multiple provider groups", () => {
      const response = {
        deliveryToDoor: [
          { providerKey: "cdek", tariffs: [makeTariff(1, 500)] },
          { providerKey: "boxberry", tariffs: [makeTariff(2, 150)] },
        ],
      }

      const result = getCheapestTariff(response, 1)

      expect((result as any).tariffId).toBe(2)
      expect((result as any).providerKey).toBe("boxberry")
    })
  })

  describe("deliveryType=2 (deliveryToPoint)", () => {
    it("uses deliveryToPoint when deliveryType is 2", () => {
      const response = {
        deliveryToDoor: [
          { providerKey: "cdek", tariffs: [makeTariff(10, 9999)] }, // should be ignored
        ],
        deliveryToPoint: [
          { providerKey: "boxberry", tariffs: [makeTariff(20, 100)] },
        ],
      }

      const result = getCheapestTariff(response as any, 2)

      expect((result as any).tariffId).toBe(20)
      expect((result as any).deliveryCost).toBe(100)
    })

    it("returns empty object when deliveryToPoint is empty", () => {
      const response = { deliveryToPoint: [] }

      const result = getCheapestTariff(response as any, 2)

      expect(result).toEqual({})
    })
  })

  it("returns the single tariff when only one exists", () => {
    const response = {
      deliveryToDoor: [
        { providerKey: "cdek", tariffs: [makeTariff(99, 350)] },
      ],
    }

    const result = getCheapestTariff(response, 1)

    expect((result as any).tariffId).toBe(99)
    expect((result as any).deliveryCost).toBe(350)
  })
})
