/**
 * Stand-in for the OpenAPI-generated PayPal Orders v2 client during unit tests.
 */
export class Configuration {
  constructor(public options?: unknown) {}
}

class StubApi {
  constructor(public configuration?: unknown) {}
}

export class OrdersApi extends StubApi {}
