export {}

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    "gorgo.integration.mollie": true,
    "gorgo.integration.mollie.side": true
  }
}
