import { mapToApishipOrderRequest } from "../mapping"
import { makeApishipOptions, makeOrder, baseStockLocation } from "../../core/__tests__/test-utils"

// Stock location where city+address_1+address_2 are all present
const fullAddressStockLocation = {
  ...baseStockLocation,
  address: {
    ...baseStockLocation.address,
    city: "Санкт-Петербург",
    address_1: "Невский пр.",
    address_2: "д. 1",
    country_code: "RU",
    province: "Ленинградская область",
    postal_code: "190000",
    phone: "+79009876543",
    company: "ООО Горго",
  },
}

// Stock location with no address_2 (falls back to default_sender_settings.address_string)
const partialAddressStockLocation = {
  ...baseStockLocation,
  address: {
    country_code: "RU",
    city: "Санкт-Петербург",
    address_1: "Невский пр.",
    // no address_2
  },
}

function callMapping(overrides: {
  options?: any
  order?: any
  stockLocation?: any
  providerKey?: string
  tariffId?: number
  deliveryType?: number
  pickupType?: number
  pointOutId?: number
} = {}) {
  return mapToApishipOrderRequest(
    overrides.options ?? makeApishipOptions(),
    overrides.order ?? makeOrder(),
    overrides.stockLocation ?? fullAddressStockLocation,
    overrides.providerKey ?? "cdek",
    overrides.tariffId ?? 123,
    overrides.deliveryType ?? 1,
    overrides.pickupType ?? 1,
    overrides.pointOutId
  )
}

describe("mapToApishipOrderRequest", () => {
  describe("sender mapping", () => {
    it("builds addressString from city+address_1+address_2 when all parts present", () => {
      const result = callMapping()
      expect(result.sender!.addressString).toBe("Санкт-Петербург, Невский пр., д. 1")
    })

    it("falls back to default_sender_settings.address_string when parts missing", () => {
      const result = callMapping({ stockLocation: partialAddressStockLocation })
      expect(result.sender!.addressString).toBe(
        makeApishipOptions().settings.default_sender_settings.address_string
      )
    })

    it("includes region when province present", () => {
      const result = callMapping()
      expect((result.sender as any).region).toBe("Ленинградская область")
    })

    it("includes city when present", () => {
      const result = callMapping()
      expect((result.sender as any).city).toBe("Санкт-Петербург")
    })

    it("includes companyName when company present", () => {
      const result = callMapping()
      expect((result.sender as any).companyName).toBe("ООО Горго")
    })

    it("includes postIndex when postal_code present", () => {
      const result = callMapping()
      expect((result.sender as any).postIndex).toBe("190000")
    })
  })

  describe("recipient mapping", () => {
    it("uppercases countryCode", () => {
      const order = makeOrder({
        shipping_address: { ...makeOrder().shipping_address, country_code: "ru" },
      })
      const result = callMapping({ order })
      expect(result.recipient!.countryCode).toBe("RU")
    })

    it("builds addressString from city+address_1+address_2", () => {
      const result = callMapping()
      expect(result.recipient!.addressString).toContain("Москва")
    })

    it("joins contactName from first_name + last_name", () => {
      const result = callMapping()
      expect(result.recipient!.contactName).toBe("Иван Иванов")
    })

    it("includes email when customer email is present", () => {
      const order = makeOrder({ customer: { email: "buyer@example.com" } })
      const result = callMapping({ order })
      expect((result.recipient as any).email).toBe("buyer@example.com")
    })

    it("omits email when customer is absent", () => {
      const result = callMapping()
      expect((result.recipient as any).email).toBeUndefined()
    })

    it("includes companyName when shipping_address.company present", () => {
      const order = makeOrder({
        shipping_address: { ...makeOrder().shipping_address, company: "ООО Покупатель" },
      })
      const result = callMapping({ order })
      expect((result.recipient as any).companyName).toBe("ООО Покупатель")
    })
  })

  describe("item / place mapping", () => {
    it("uses variant dimensions when provided", () => {
      const result = callMapping()
      const item = result.places![0].items![0]
      expect(item.height).toBe(10)
      expect(item.length).toBe(20)
      expect(item.width).toBe(15)
      expect(item.weight).toBe(500)
    })

    it("falls back to default_product_sizes when variant dimensions missing", () => {
      const order = makeOrder({
        items: [{ id: "i1", title: "T", subtitle: null, quantity: 1, unit_price: 100, variant: {} }],
      })
      const result = callMapping({ order })
      const item = result.places![0].items![0]
      expect(item.height).toBe(10)
      expect(item.length).toBe(10)
      expect(item.width).toBe(10)
      expect(item.weight).toBe(20)
    })

    it("includes articul when variant.sku is defined", () => {
      const result = callMapping()
      expect((result.places![0].items![0] as any).articul).toBe("SKU-001")
    })

    it("includes barcode when variant.barcode is defined", () => {
      const result = callMapping()
      expect((result.places![0].items![0] as any).barcode).toBe("1234567890")
    })

    it("omits articul when variant.sku is undefined", () => {
      const order = makeOrder({
        items: [{ id: "i1", title: "T", subtitle: null, quantity: 1, unit_price: 100, variant: { barcode: "B1" } }],
      })
      const result = callMapping({ order })
      expect((result.places![0].items![0] as any).articul).toBeUndefined()
    })

    it("omits barcode when variant.barcode is undefined", () => {
      const order = makeOrder({
        items: [{ id: "i1", title: "T", subtitle: null, quantity: 1, unit_price: 100, variant: { sku: "S1" } }],
      })
      const result = callMapping({ order })
      expect((result.places![0].items![0] as any).barcode).toBeUndefined()
    })
  })

  describe("COD vs non-COD cost", () => {
    it("is_cod=false: item cost is 0, codCost is 0, no paymentMethod", () => {
      const result = callMapping()
      expect(result.places![0].items![0].cost).toBe(0)
      expect(result.cost!.codCost).toBe(0)
      expect((result.cost as any).paymentMethod).toBeUndefined()
    })

    it("is_cod=true: item cost equals unit_price, codCost equals total, paymentMethod=3", () => {
      const options = makeApishipOptions()
      options.settings.is_cod = true
      const result = callMapping({ options })

      expect(result.places![0].items![0].cost).toBe(1000) // unit_price from makeOrder
      expect(result.cost!.codCost).toBe(1000) // 1000 * 1 quantity
      expect((result.cost as any).paymentMethod).toBe(3)
    })
  })

  describe("weight and dimensions calculation", () => {
    it("totalWeight is sum of item.weight × quantity", () => {
      const order = makeOrder({
        items: [
          { id: "i1", title: "A", subtitle: null, quantity: 2, unit_price: 100, variant: { weight: 300 } },
          { id: "i2", title: "B", subtitle: null, quantity: 1, unit_price: 100, variant: { weight: 500 } },
        ],
      })
      const result = callMapping({ order })
      // 300*2 + 500*1 = 1100
      expect(result.order!.weight).toBe(1100)
    })

    it("placeHeight is sum of sorted[0] × quantity", () => {
      // item with h=5, w=10, l=20, qty=2
      // sorted = [5,10,20], minSum = 5*2 = 10
      const order = makeOrder({
        items: [
          { id: "i1", title: "A", subtitle: null, quantity: 2, unit_price: 100, variant: { height: 5, width: 10, length: 20, weight: 100 } },
        ],
      })
      const result = callMapping({ order })
      expect(result.places![0].height).toBe(10)
    })
  })

  describe("pointOutId", () => {
    it("includes pointOutId in order when deliveryType=2", () => {
      const result = callMapping({ deliveryType: 2, pointOutId: 42 })
      expect((result.order as any).pointOutId).toBe(42)
    })

    it("omits pointOutId when deliveryType=1", () => {
      const result = callMapping({ deliveryType: 1, pointOutId: 42 })
      expect((result.order as any).pointOutId).toBeUndefined()
    })
  })

  describe("providerConnectId lookup", () => {
    it("throws MedusaError when no enabled connection found for providerKey", () => {
      const options = makeApishipOptions()
      options.settings.connections = [
        { id: "c1", name: "n", provider_key: "cdek", provider_connect_id: "p1", is_enabled: false },
      ]
      expect(() => callMapping({ options, providerKey: "cdek" })).toThrow(
        /providerConnectId/
      )
    })

    it("throws MedusaError when no connection matches providerKey", () => {
      expect(() => callMapping({ providerKey: "unknown-provider" })).toThrow(
        /providerConnectId/
      )
    })
  })

  describe("mapItemVatRateToEnum", () => {
    it.each([0, 5, 7, 10, 20])("maps valid VAT rate %i to itself", (rate) => {
      const order = makeOrder({
        items: [{ id: "i1", title: "T", subtitle: null, quantity: 1, unit_price: 100, variant: {}, tax_lines: [{ rate }] }],
      })
      const result = callMapping({ order })
      expect(result.places![0].items![0].costVat).toBe(rate)
    })

    it("maps unknown VAT rate to -1", () => {
      const order = makeOrder({
        items: [{ id: "i1", title: "T", subtitle: null, quantity: 1, unit_price: 100, variant: {}, tax_lines: [{ rate: 15 }] }],
      })
      const result = callMapping({ order })
      expect(result.places![0].items![0].costVat).toBe(-1)
    })

    it("maps item with no tax_lines to -1", () => {
      const order = makeOrder({
        items: [{ id: "i1", title: "T", subtitle: null, quantity: 1, unit_price: 100, variant: {} }],
      })
      const result = callMapping({ order })
      expect(result.places![0].items![0].costVat).toBe(-1)
    })
  })
})
