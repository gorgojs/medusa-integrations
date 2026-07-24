import { mapToApishipCalculatorRequest } from "../mapping"
import { makeApishipOptions } from "../../core/__tests__/test-utils"

const baseOptionData = {
  id: "apiship_doortodoor",
  deliveryType: 1,
  pickupType: 2,
}

const baseContext = {
  id: "cart-01",
  shipping_address: {
    country_code: "ru",
    city: "Москва",
    address_1: "ул. Ленина, 1",
    address_2: "кв. 5",
    province: "Московская область",
    postal_code: "101000",
  },
  from_location: {
    address: {
      country_code: "ru",
      city: "Санкт-Петербург",
      address_1: "Невский пр. 1",
      address_2: "оф. 101",
      province: "Ленинградская область",
      postal_code: "190000",
    },
  },
  items: [
    {
      id: "item-01",
      quantity: 2,
      unit_price: 1500,
      variant: { weight: 500, height: 10, length: 20, width: 15 },
    },
  ],
} as any

describe("mapToApishipCalculatorRequest", () => {
  describe("toAddress (from shipping_address)", () => {
    it("maps country_code uppercased", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect(result.to.countryCode).toBe("RU")
    })

    it("maps city", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect((result.to as any).city).toBe("Москва")
    })

    it("maps postal_code as index", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect((result.to as any).index).toBe("101000")
    })

    it("maps province as region", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect((result.to as any).region).toBe("Московская область")
    })

    it("builds addressString from city + address_1 + address_2", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect((result.to as any).addressString).toBe("Москва, ул. Ленина, 1, кв. 5")
    })

    it("skips null/undefined address parts in addressString", () => {
      const ctx = {
        ...baseContext,
        shipping_address: { ...baseContext.shipping_address, address_2: null },
      }
      const result = mapToApishipCalculatorRequest(baseOptionData, ctx, makeApishipOptions())
      expect((result.to as any).addressString).not.toContain("null")
    })
  })

  describe("fromAddress (from from_location.address)", () => {
    it("maps country_code from stock location (not uppercased — uses raw value)", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      // fromAddress uses the raw value (no .toUpperCase() in the mapping)
      expect((result.from as any).countryCode).toBe("ru")
    })

    it("maps postal_code as index", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect((result.from as any).index).toBe("190000")
    })
  })

  describe("places (items expanded by quantity)", () => {
    it("expands each item by its quantity", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      // quantity=2 → 2 place entries
      expect(result.places).toHaveLength(2)
    })

    it("uses variant dimensions for each place", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect(result.places[0]).toMatchObject({ height: 10, length: 20, width: 15, weight: 500 })
      expect(result.places[1]).toMatchObject({ height: 10, length: 20, width: 15, weight: 500 })
    })

    it("falls back to default constants when variant has no dimensions", () => {
      const ctx = {
        ...baseContext,
        items: [{ id: "item-02", quantity: 1, unit_price: 500, variant: {} }],
      }
      const result = mapToApishipCalculatorRequest(baseOptionData, ctx, makeApishipOptions())
      expect(result.places[0]).toMatchObject({ height: 10, length: 10, width: 10, weight: 20 })
    })

    it("expands multiple items with different quantities", () => {
      const ctx = {
        ...baseContext,
        items: [
          { id: "i1", quantity: 3, unit_price: 100, variant: {} },
          { id: "i2", quantity: 1, unit_price: 200, variant: {} },
        ],
      }
      const result = mapToApishipCalculatorRequest(baseOptionData, ctx, makeApishipOptions())
      expect(result.places).toHaveLength(4)
    })
  })

  describe("cost calculation", () => {
    it("assessedCost is sum of unit_price × quantity", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      // 1500 * 2 = 3000
      expect(result.assessedCost).toBe(3000)
    })

    it("codCost is 0 when is_cod=false", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions({ settings: { ...makeApishipOptions().settings, is_cod: false } }))
      expect(result.codCost).toBe(0)
    })

    it("codCost equals assessedCost when is_cod=true", () => {
      const options = makeApishipOptions()
      options.settings.is_cod = true
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, options)
      expect(result.codCost).toBe(result.assessedCost)
    })
  })

  describe("delivery and pickup types", () => {
    it("sets pickupTypes from optionData.pickupType", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect(result.pickupTypes).toEqual([2])
    })

    it("sets deliveryTypes from optionData.deliveryType", () => {
      const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
      expect(result.deliveryTypes).toEqual([1])
    })
  })

  it("always sets includeFees=false", () => {
    const result = mapToApishipCalculatorRequest(baseOptionData, baseContext, makeApishipOptions())
    expect(result.includeFees).toBe(false)
  })
})
