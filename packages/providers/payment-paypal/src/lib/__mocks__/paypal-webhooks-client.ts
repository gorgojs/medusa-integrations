/**
 * Stand-in for the OpenAPI-generated PayPal Webhooks v1 client during unit tests.
 */
export class Configuration {
  constructor(public options?: unknown) {}
}

class StubApi {
  constructor(public configuration?: unknown) {}
}

export class VerifyWebhookSignatureApi extends StubApi {}
export class WebhooksApi extends StubApi {}
