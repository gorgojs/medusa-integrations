export function makeLogger() {
  const noop = () => {}
  return new Proxy({} as any, {
    get: () => noop,
  })
}

/** Valid fully-populated ApishipOptionsDTO (after normalization) */
export function makeApishipOptions(overrides: Record<string, any> = {}): any {
  return {
    token: "test-apiship-token",
    is_test: true,
    settings: {
      connections: [
        {
          id: "conn-1",
          name: "CDEK Test",
          provider_key: "cdek",
          provider_connect_id: "connect-123",
          is_enabled: true,
        },
      ],
      default_sender_settings: {
        country_code: "RU",
        address_string: "Санкт-Петербург, Невский пр. 1",
        contact_name: "Иван Иванов",
        phone: "+79001234567",
      },
      default_product_sizes: {
        length: 10,
        width: 10,
        height: 10,
        weight: 20,
      },
      delivery_cost_vat: -1,
      is_cod: false,
    },
    ...overrides,
  }
}

/** Returns a mock ApishipClient with all methods as jest.fn() */
export function makeApishipClient() {
  return {
    calculatorApi: {
      getCalculator: jest.fn(),
    },
    ordersApi: {
      addOrder: jest.fn(),
      cancelOrder: jest.fn(),
      getOrderInfo: jest.fn(),
    },
    orderDocsApi: {
      getLabels: jest.fn(),
      getWaybills: jest.fn(),
    },
    listsApi: {
      getListTariffs: jest.fn(),
    },
    connectionsApi: {
      getConnections: jest.fn(),
    },
    configuration: {},
  }
}

/** Minimal shipping address fixture */
export const baseShippingAddress = {
  country_code: "RU",
  city: "Москва",
  address_1: "ул. Ленина, 1",
  address_2: "кв. 5",
  province: "Московская область",
  postal_code: "101000",
  first_name: "Иван",
  last_name: "Иванов",
  phone: "+79001234567",
  customer_id: "customer-01",
}

/** Minimal stock location fixture */
export const baseStockLocation = {
  id: "loc-01",
  name: "Main Warehouse",
  address: {
    country_code: "RU",
    city: "Санкт-Петербург",
    address_1: "Невский пр.",
    address_2: "д. 1",
    province: "Ленинградская область",
    postal_code: "190000",
    phone: "+79009876543",
    company: "",
  },
} as any

/** Minimal order fixture */
export function makeOrder(overrides: Record<string, any> = {}): any {
  return {
    id: "order-01",
    shipping_address: { ...baseShippingAddress },
    items: [
      {
        id: "item-01",
        title: "Test Product",
        subtitle: null,
        quantity: 1,
        unit_price: 1000,
        variant: {
          sku: "SKU-001",
          barcode: "1234567890",
          weight: 500,
          height: 10,
          length: 20,
          width: 15,
        },
        tax_lines: [{ rate: 20 }],
      },
    ],
    ...overrides,
  }
}
