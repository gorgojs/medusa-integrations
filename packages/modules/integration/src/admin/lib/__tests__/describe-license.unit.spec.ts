import { describe, expect, it } from "@jest/globals"
import {
  describeLicense,
  GORGO_CABINET_URL,
  GORGO_TOKENS_URL,
  licenseFormat,
  type LicenseFormat,
} from "../describe-license"
import type { LicenseStateEntry } from "../../../modules/integration/types"

const NOW = Date.UTC(2026, 9, 27, 12)
const DAY = 24 * 60 * 60 * 1000
const PROJECT_URL = "https://app.gorgojs.com/org_1/projects/prj_1/key"

const format: LicenseFormat = {
  date: (iso) => `date ${iso.slice(0, 10)}`,
  inDays: (days) => `in ${days} days`,
  ago: (iso) => `since ${iso.slice(11, 16)}`,
}

const at = (ms: number) => new Date(ms).toISOString()

function entry(over: Partial<LicenseStateEntry> = {}): LicenseStateEntry {
  return {
    package: "@gorgo-store/medusa-erp-1c",
    state: "ok",
    checked_at: "2026-10-27T10:00:00.000Z",
    host: "api.shop.ru",
    project: { handle: "shop", name: "My Shop", url: PROJECT_URL },
    environment: { id: "env_1", name: "production" },
    subscription: { ends_at: null, cutoff: null },
    latest_allowed_version: null,
    identifiers: ["erp_1c"],
    ...over,
  }
}

const describeAt = (e: LicenseStateEntry) => describeLicense(e, { now: NOW, format })
const key = (k: string) => `integration.license.${k}`

describe("describeLicense", () => {
  it("pending: grey, while the first check runs, with nothing to click", () => {
    expect(describeAt(entry({ state: "pending", checked_at: null, project: null, subscription: null }))).toEqual({
      tone: "grey",
      line: { key: key("title.pending") },
      title: { key: key("title.pending") },
      hint: { key: key("hint.pending") },
    })
  })

  it("ok without an end date: green, where it was checked, and the account", () => {
    expect(describeAt(entry())).toEqual({
      tone: "green",
      line: { key: key("title.active") },
      title: { key: key("title.active") },
      context: { project: "My Shop", environment: "production" },
      checked: "since 10:00",
      action: { key: key("action.account"), href: PROJECT_URL },
    })
  })

  it("ok and renews: the card names the renewal date, the table line stays short", () => {
    const view = describeAt(entry({ subscription: { ends_at: "2026-11-12T00:00:00.000Z", cutoff: null, renews: true } }))
    expect(view).toMatchObject({
      tone: "green",
      line: { key: key("title.active") },
      title: { key: key("title.renews"), values: { date: "date 2026-11-12" } },
    })
  })

  it("ok on localhost: the environment is null, the admin says local", () => {
    expect(describeAt(entry({ environment: null })).context).toEqual({ project: "My Shop", environment: null })
  })

  it("ok, does not renew, more than three days left: green with the end date", () => {
    const view = describeAt(entry({ subscription: { ends_at: at(NOW + 7 * DAY), cutoff: null, renews: false } }))
    expect(view).toMatchObject({
      tone: "green",
      line: { key: key("title.until"), values: { date: "date 2026-11-03" } },
      title: { key: key("title.until"), values: { date: "date 2026-11-03" } },
      action: { key: key("action.account") },
    })
  })

  it("ok, does not renew, three days or less: orange, renew", () => {
    const view = describeAt(entry({ subscription: { ends_at: at(NOW + 2 * DAY - 1), cutoff: null, renews: false } }))
    expect(view).toEqual({
      tone: "orange",
      line: { key: key("title.ending"), values: { when: "in 2 days" } },
      title: { key: key("title.ending"), values: { when: "in 2 days" } },
      hint: { key: key("hint.ending") },
      checked: "since 10:00",
      action: { key: key("action.renew"), href: PROJECT_URL },
    })
  })

  it("ok, the platform does not say whether it renews: green with the end date, no warning", () => {
    const view = describeAt(entry({ subscription: { ends_at: at(NOW + 2 * DAY), cutoff: null } }))
    expect(view).toMatchObject({ tone: "green", title: { key: key("title.until") } })
  })

  it("ok, cutoff in the past: orange, the versions the license still covers", () => {
    const view = describeAt(
      entry({
        subscription: { ends_at: "2026-10-12T00:00:00.000Z", cutoff: "2026-10-12T00:00:00.000Z" },
        latest_allowed_version: "1.2.4",
      }),
    )
    expect(view).toEqual({
      tone: "orange",
      line: { key: key("title.ended"), values: { date: "date 2026-10-12" } },
      title: { key: key("title.ended"), values: { date: "date 2026-10-12" } },
      hint: { key: key("hint.ended"), values: { version: "1.2.4" } },
      checked: "since 10:00",
      action: { key: key("action.renew"), href: PROJECT_URL },
    })
  })

  it.each<["missing" | "malformed" | "invalid_token", string]>([
    ["missing", "action.getKey"],
    ["malformed", "action.getKey"],
    ["invalid_token", "action.reissueKey"],
  ])("failed with %s: red, the key page of the cabinet", (reason, action) => {
    expect(describeAt(entry({ state: "failed", reason, project: null, subscription: null }))).toMatchObject({
      tone: "red",
      title: { key: key(`title.${reason}`) },
      hint: { key: key(`hint.${reason}`) },
      action: { key: key(action), href: GORGO_TOKENS_URL },
    })
  })

  it("failed with no_subscription: red, subscribe in the project", () => {
    expect(describeAt(entry({ state: "failed", reason: "no_subscription" }))).toMatchObject({
      tone: "red",
      title: { key: key("title.no_subscription") },
      hint: { key: key("hint.no_subscription"), values: { project: "My Shop" } },
      action: { key: key("action.subscribe"), href: PROJECT_URL },
    })
  })

  it("failed with domain_not_allowed: red, names the host, add it to the project", () => {
    expect(describeAt(entry({ state: "failed", reason: "domain_not_allowed", environment: null }))).toMatchObject({
      tone: "red",
      title: { key: key("title.domain_not_allowed") },
      hint: { key: key("hint.domain_not_allowed"), values: { host: "api.shop.ru", project: "My Shop" } },
      action: { key: key("action.addDomain"), href: PROJECT_URL },
    })
  })

  it("failed with version_after_cutoff: orange, the version to install, renew", () => {
    const view = describeAt(
      entry({
        state: "failed",
        reason: "version_after_cutoff",
        subscription: { ends_at: null, cutoff: "2026-10-12T00:00:00.000Z" },
        latest_allowed_version: "1.2.4",
      }),
    )
    expect(view).toMatchObject({
      tone: "orange",
      title: { key: key("title.version_after_cutoff") },
      hint: { key: key("hint.version_after_cutoff"), values: { version: "1.2.4" } },
      action: { key: key("action.renew"), href: PROJECT_URL },
    })
  })

  it("failed with version_unverifiable: orange, the check repeats by itself", () => {
    const view = describeAt(entry({ state: "failed", reason: "version_unverifiable" }))
    expect(view).toMatchObject({ tone: "orange", hint: { key: key("hint.version_unverifiable") } })
    expect(view).not.toHaveProperty("action")
  })

  it("failed for a reason it does not know: red, the account", () => {
    expect(describeAt(entry({ state: "failed", reason: "unknown" }))).toMatchObject({
      tone: "red",
      title: { key: key("title.unknown") },
      hint: { key: key("hint.unknown") },
      action: { key: key("action.account"), href: PROJECT_URL },
    })
  })

  it("unreachable: orange, our outage, nothing for the merchant to fix", () => {
    const view = describeAt(entry({ state: "unreachable" }))
    expect(view).toMatchObject({ tone: "orange", title: { key: key("title.unreachable") }, hint: { key: key("hint.unreachable") } })
    expect(view).not.toHaveProperty("action")
  })

  it("opens the cabinet when the platform sent no project link", () => {
    const view = describeAt(entry({ state: "failed", reason: "no_subscription", project: { handle: "shop", name: "My Shop" } }))
    expect(view.action).toEqual({ key: key("action.subscribe"), href: GORGO_CABINET_URL })
  })

  it("never links to an address that is not https", () => {
    const view = describeAt(entry({ project: { handle: "shop", name: "My Shop", url: "javascript:alert(1)" } }))
    expect(view.action?.href).toBe(GORGO_CABINET_URL)
  })

  it("leaves out a hint whose value is unknown rather than show a blank", () => {
    expect(describeAt(entry({ state: "failed", reason: "domain_not_allowed", host: undefined }))).not.toHaveProperty("hint")
    expect(describeAt(entry({ state: "failed", reason: "no_subscription", project: null }))).not.toHaveProperty("hint")
    expect(describeAt(entry({ state: "failed", reason: "version_after_cutoff" }))).not.toHaveProperty("hint")
  })
})

describe("licenseFormat", () => {
  it("writes dates and days in the admin's language", () => {
    const en = licenseFormat("en", NOW)
    expect(en.date("2026-11-12T12:00:00.000Z")).toBe("Nov 12, 2026")
    expect(en.inDays(2)).toBe("in 2 days")
    expect(en.inDays(1)).toBe("tomorrow")
    expect(licenseFormat("ru", NOW).inDays(3)).toBe("через 3 дня")
  })

  it("counts the time since the check in the largest whole unit", () => {
    const ru = licenseFormat("ru", NOW)
    expect(ru.ago(at(NOW - 20 * 1000))).toBe("сейчас")
    expect(ru.ago(at(NOW - 5 * 60 * 1000))).toBe("5 мин. назад")
    expect(ru.ago(at(NOW - 2 * 60 * 60 * 1000 - 59 * 60 * 1000))).toBe("2 ч назад")
    expect(ru.ago(at(NOW - DAY))).toBe("вчера")
  })

  it("reads Medusa's language codes such as ptBR and falls back to English on one it cannot", () => {
    expect(licenseFormat("ptBR", NOW).inDays(1)).toBe("amanhã")
    expect(licenseFormat("zhCN", NOW).inDays(1)).toBe("明天")
    expect(licenseFormat("not a language", NOW).inDays(1)).toBe("tomorrow")
  })
})
