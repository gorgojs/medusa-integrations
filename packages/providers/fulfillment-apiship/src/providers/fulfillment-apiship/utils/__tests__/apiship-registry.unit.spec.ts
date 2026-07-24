/**
 * apiship-registry holds a module-level Map.
 * jest.resetModules() + require() in beforeEach gives each test a fresh,
 * empty registry so tests don't share state.
 */

let registerApishipClient: (providerId: string, bundle: any) => void
let getApishipClient: (providerId?: string) => any

beforeEach(() => {
  jest.resetModules()
  const mod = require("../apiship-registry")
  registerApishipClient = mod.registerApishipClient
  getApishipClient = mod.getApishipClient
})

const makeBundle = (tag = "default") => ({
  ordersApi: { tag, type: "orders" },
  orderDocsApi: { tag, type: "orderDocs" },
  listsApi: { tag, type: "lists" },
  calculatorApi: { tag, type: "calculator" },
})

describe("registerApishipClient / getApishipClient", () => {
  describe("registration and retrieval", () => {
    it("returns the bundle that was registered for the given providerId", () => {
      const bundle = makeBundle("cdek")
      registerApishipClient("apiship_cdek", bundle)

      const result = getApishipClient("apiship_cdek")

      expect(result).toBe(bundle)
    })

    it("stores multiple providers independently", () => {
      const bundleA = makeBundle("a")
      const bundleB = makeBundle("b")
      registerApishipClient("provider_a", bundleA)
      registerApishipClient("provider_b", bundleB)

      expect(getApishipClient("provider_a")).toBe(bundleA)
      expect(getApishipClient("provider_b")).toBe(bundleB)
    })

    it("overwrites a previously registered bundle for the same providerId", () => {
      const first = makeBundle("first")
      const second = makeBundle("second")
      registerApishipClient("provider_x", first)
      registerApishipClient("provider_x", second)

      expect(getApishipClient("provider_x")).toBe(second)
    })
  })

  describe("default providerId", () => {
    it("uses 'apiship_apiship' as the default when no providerId is passed", () => {
      const bundle = makeBundle("default")
      registerApishipClient("apiship_apiship", bundle)

      const result = getApishipClient() // no argument

      expect(result).toBe(bundle)
    })

    it("explicit 'apiship_apiship' and no-argument call resolve to the same bundle", () => {
      const bundle = makeBundle()
      registerApishipClient("apiship_apiship", bundle)

      expect(getApishipClient("apiship_apiship")).toBe(getApishipClient())
    })
  })

  describe("error when not initialized", () => {
    it("throws when providerId was never registered", () => {
      expect(() => getApishipClient("never_registered")).toThrow(
        /never_registered/
      )
    })

    it("throws an Error (not just any exception)", () => {
      expect(() => getApishipClient("ghost")).toThrowError(Error)
    })

    it("error message mentions the providerId", () => {
      const id = "my_missing_provider"
      let msg = ""
      try {
        getApishipClient(id)
      } catch (e: any) {
        msg = e.message
      }
      expect(msg).toContain(id)
    })

    it("error message mentions 'not initialized'", () => {
      expect(() => getApishipClient("x")).toThrow(/not initialized/)
    })

    it("throws with default providerId 'apiship_apiship' when registry is empty", () => {
      expect(() => getApishipClient()).toThrow(/apiship_apiship/)
    })
  })

  describe("bundle integrity", () => {
    it("returned bundle exposes ordersApi, orderDocsApi, listsApi, calculatorApi", () => {
      const bundle = makeBundle()
      registerApishipClient("p1", bundle)

      const result = getApishipClient("p1")

      expect(result.ordersApi).toBeDefined()
      expect(result.orderDocsApi).toBeDefined()
      expect(result.listsApi).toBeDefined()
      expect(result.calculatorApi).toBeDefined()
    })

    it("returned bundle is the exact same reference (not a copy)", () => {
      const bundle = makeBundle()
      registerApishipClient("p2", bundle)

      expect(getApishipClient("p2")).toBe(bundle)
    })
  })
})
