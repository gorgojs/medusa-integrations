/**
 * Stand-in for the OpenAPI-generated ApiShip SDK during unit tests.
 */
export class Configuration {
  constructor(public options?: unknown) {}
}

class StubApi {
  constructor(public configuration?: unknown) {}
}

export class OrdersApi extends StubApi {}
export class OrderDocsApi extends StubApi {}
export class ListsApi extends StubApi {}
export class CalculatorApi extends StubApi {}
export class ConnectionsApi extends StubApi {}
