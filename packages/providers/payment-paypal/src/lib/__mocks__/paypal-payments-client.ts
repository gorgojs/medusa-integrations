/**
 * Stand-in for the OpenAPI-generated PayPal Payments v2 client during unit tests.
 */
export class Configuration {
  constructor(public options?: unknown) {}
}

class StubApi {
  constructor(public configuration?: unknown) {}
}

export class AuthorizationsApi extends StubApi {}
export class CapturesApi extends StubApi {}
export class RefundsApi extends StubApi {}
