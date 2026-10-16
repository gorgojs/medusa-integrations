#!/bin/sh
# Generates one typescript-axios client per vendored PayPal spec.
# openapi-generator-cli runs in Docker as root, so the output is removed and
# chowned through an alpine container to keep it owned by the current user.
set -e

gen() {
  spec="$1"
  out="src/lib/$2"
  docker run --rm -v "$(pwd):/local" alpine rm -rf "/local/$out"
  openapi-generator-cli generate \
    -i "/local/openapi/$spec.json" \
    -g typescript-axios \
    -o "/local/$out" \
    --skip-validate-spec \
    --additional-properties=useSingleRequestParameter=true
  docker run --rm -v "$(pwd):/local" alpine chown -R "$(id -u):$(id -g)" "/local/$out"
}

gen checkout_orders_v2 paypal-orders-client
gen payments_payment_v2 paypal-payments-client
gen notifications_webhooks_v1 paypal-webhooks-client
