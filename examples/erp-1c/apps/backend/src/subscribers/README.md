# Custom subscribers

Subscribers handle events emitted in the Medusa application.

> Learn more about Subscribers in [this documentation](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers).

## In this starter

This directory already holds eight subscribers. Seven send transactional emails through the `smtp` notification provider: [`customer-created.ts`](./customer-created.ts), [`password-reset-email.ts`](./password-reset-email.ts), [`order-placed-email.ts`](./order-placed-email.ts), [`order-completed-email.ts`](./order-completed-email.ts), [`order-fulfillment-created-email.ts`](./order-fulfillment-created-email.ts), [`order-transfer-requested-email.ts`](./order-transfer-requested-email.ts), and [`payment-captured-email.ts`](./payment-captured-email.ts), each rendering a template from [`../emails`](../emails). The eighth, [`product-updated.ts`](./product-updated.ts), posts a revalidation webhook to the storefront on every catalog and translation event. See the [starter documentation](https://docs.gorgojs.com/tools/medusa-dtc-starter) for how they fit together.

The subscriber is created in a TypeScript or JavaScript file under the `src/subscribers` directory.

For example, create the file `src/subscribers/product-created.ts` with the following content:

```ts
import {
  type SubscriberConfig,
} from "@medusajs/framework"

// subscriber function
export default async function productCreateHandler() {
  console.log("A product was created")
}

// subscriber config
export const config: SubscriberConfig = {
  event: "product.created",
}
```

A subscriber file must export:

- The subscriber function that is an asynchronous function executed whenever the associated event is triggered.
- A configuration object defining the event this subscriber is listening to.

## Subscriber Parameters

A subscriber receives an object having the following properties:

- `event`: An object holding the event's details. It has a `data` property, which is the event's data payload.
- `container`: The Medusa container. Use it to resolve modules' main services and other registered resources.

```ts
import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

export default async function productCreateHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id

  const productModuleService = container.resolve("product")

  const product = await productModuleService.retrieveProduct(productId)

  console.log(`The product ${product.title} was created`)
}

export const config: SubscriberConfig = {
  event: "product.created",
}
```