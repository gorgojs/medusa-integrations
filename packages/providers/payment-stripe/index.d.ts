export {}

declare module "@medusajs/admin-shared" {
  interface InjectionZoneRegistry {
    "gorgo.integration.stripe": true,
    "gorgo.integration.stripe.side": true
  }
}
