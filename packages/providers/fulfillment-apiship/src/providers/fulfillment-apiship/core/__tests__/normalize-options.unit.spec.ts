jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

jest.mock("../../../../workflows", () => ({
  getCalculationWorkflow: jest.fn(),
  saveCalculationWorkflow: jest.fn(),
  getStockLocationWorkflow: jest.fn(),
  getShippingOptionWorkflow: jest.fn(),
}))

jest.mock("../../../../lib/client", () => ({
  createApishipClient: jest.fn(),
}))

import ApishipService from "../../services/apiship"
import { makeLogger } from "./test-utils"

// Option normalization itself moved to `src/lib/apiship-options.ts` (shared with the admin
// workflows) and is covered by `src/lib/__tests__/apiship-options.unit.spec.ts`.

describe("ApishipBase.assertOrderOptions_ (private helper)", () => {
  let service: any

  beforeEach(() => {
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
  })

  const validOptions = {
    token: "tok",
    is_test: true,
    sender_country_code: "RU",
    sender_address_string: "Moscow",
    sender_contact_name: "Ivan",
    sender_phone: "+79001234567",
  }

  it("does not throw when every sender field is filled", () => {
    expect(() => service.assertOrderOptions_(validOptions)).not.toThrow()
  })

  it.each([
    "sender_country_code",
    "sender_address_string",
    "sender_contact_name",
    "sender_phone",
  ])("throws when %s is blank", (field) => {
    expect(() => service.assertOrderOptions_({ ...validOptions, [field]: "   " })).toThrow(
      new RegExp(field)
    )
  })

  it.each([
    "sender_country_code",
    "sender_address_string",
  ])("throws when %s is missing", (field) => {
    const { [field as keyof typeof validOptions]: _, ...rest } = validOptions
    expect(() => service.assertOrderOptions_(rest)).toThrow(new RegExp(field))
  })
})
