import { describe, expect, it } from "@jest/globals"
import { integrationMatches } from "../integration-search"
import type { IntegrationOverviewItem } from "../../../types"

const yookassa = {
  provider_id: "pp_yookassa_yookassa",
  identifier: "yookassa",
  instance_id: "yookassa",
  display_name: "yookassa.name",
  description: "yookassa.description",
} as IntegrationOverviewItem
const shown: Record<string, string> = {
  "yookassa.name": "ЮKassa",
  "yookassa.description": "Приём платежей картами и через СБП",
}
const translate = (key: string) => shown[key] ?? key
const matches = (q: string, item = yookassa) => integrationMatches(item, q, translate)

describe("integrationMatches", () => {
  it("matches the name and the description as shown, case-insensitively", () => {
    expect(matches(" юk ")).toBe(true)
    expect(matches("сбп")).toBe(true)
  })

  it("matches the identifier and the instance", () => {
    expect(matches("YOO")).toBe(true)
    expect(matches("shop-2", { ...yookassa, instance_id: "shop-2" })).toBe(true)
  })

  it("matches no translation key and no unknown word", () => {
    expect(matches("name")).toBe(false)
    expect(matches("description")).toBe(false)
    expect(matches("tkassa")).toBe(false)
  })

  it("keeps every integration for an empty search, a description or not", () => {
    expect(matches(" ")).toBe(true)
    expect(matches("", { ...yookassa, description: undefined })).toBe(true)
  })
})
