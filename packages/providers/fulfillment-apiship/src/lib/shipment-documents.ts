import type { ApishipClient } from "./client"

type MinimalLogger = {
  debug: (message: string) => void
}

async function executeWithRetry<T>({
  apiCall,
  request,
  isReady,
  maxAttempts = 10,
  baseDelay = 500,
  label,
  logger,
  sleep,
}: {
  apiCall: () => Promise<T>
  request?: unknown
  isReady: (res: T) => boolean
  maxAttempts?: number
  baseDelay?: number
  label?: string
  logger: MinimalLogger
  sleep: (ms: number) => Promise<unknown>
}): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(
        `${label}: request (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(request, null, 2)}`
      )
      const response = await apiCall()
      // Only the body is logged — an axios response carries the request object with it and
      // does not survive JSON.stringify.
      logger.debug(
        `${label}: response: ${JSON.stringify((response as any)?.data ?? response, null, 2)}`
      )
      if (isReady(response)) return response
      logger.debug(`${label}: not ready (attempt ${attempt}/${maxAttempts})`)
    } catch (err: any) {
      logger.debug(`${label}: error on attempt ${attempt}: ${err?.message ?? err}`)
    }
    if (attempt < maxAttempts) {
      const delay =
        baseDelay *
        Math.pow(2, attempt - 1) *
        (0.5 + Math.random() * 0.5)
      await sleep(delay)
    }
  }

  throw new Error(`${label}: data not ready after ${maxAttempts} attempts`)
}

export type FetchShipmentDocumentsInput = {
  apishipClient: ApishipClient
  orderId: number
  logger: MinimalLogger
  maxAttempts?: number
  /**
   * Whether to poll for the label PDF. Right after an order is created the carrier hasn't
   * produced one yet, so the caller can skip it and leave the label to the sync job.
   */
  waitForLabel?: boolean
  sleep?: (ms: number) => Promise<unknown>
}

export async function fetchShipmentDocuments({
  apishipClient,
  orderId,
  logger,
  maxAttempts,
  waitForLabel = true,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}: FetchShipmentDocumentsInput) {
  logger.debug(`Apiship.waitForOrderInfo input: ${orderId}`)
  const orderInfoResponse = await executeWithRetry({
    apiCall: () => apishipClient.ordersApi.getOrderInfo({ orderId }),
    request: { orderId },
    isReady: (response: any) => Boolean(response?.data?.order?.providerNumber),
    label: `orderInfo:${orderId}`,
    maxAttempts,
    logger,
    sleep,
  })
  const order = (orderInfoResponse as any).data.order
  const trackingNumber = String(order.providerNumber)
  const trackingUrl = String(order.trackingUrl ?? "")
  logger.debug(
    `Apiship.waitForOrderInfo output: ${JSON.stringify({ trackingNumber, trackingUrl }, null, 2)}`
  )

  // The tracking number above is already useful on its own — a slow label PDF shouldn't throw
  // it away. If the label isn't ready yet, return what we have; a later call (the scheduled
  // sync job) will fetch the label separately once the carrier produces it.
  let labelUrl = ""
  if (!waitForLabel) {
    logger.debug(
      `Apiship.waitForLabelUrl skipped for order ${orderId}, the sync job picks the label up`
    )
    return [
      {
        tracking_number: trackingNumber,
        tracking_url: trackingUrl || "",
        label_url: "",
      },
    ]
  }

  logger.debug(`Apiship.waitForLabelUrl input: ${orderId}`)
  try {
    const labelResponse = await executeWithRetry({
      apiCall: () => apishipClient.orderDocsApi.getLabels({
        labelsRequest: { orderIds: [orderId], format: "pdf" },
      }),
      request: { labelsRequest: { orderIds: [orderId], format: "pdf" } },
      isReady: (response: any) => Boolean(response?.data?.url),
      label: `labels:${orderId}`,
      maxAttempts,
      logger,
      sleep,
    })
    labelUrl = String((labelResponse as any).data.url)
    logger.debug(`Apiship.waitForLabelUrl output: ${labelUrl}`)
  } catch (e: any) {
    logger.debug(`Apiship.waitForLabelUrl failed, keeping the tracking number without a label: ${e?.message ?? e}`)
  }

  return [
    {
      tracking_number: trackingNumber,
      tracking_url: trackingUrl || "",
      label_url: labelUrl || "",
    },
  ]
}

/**
 * True when a fulfillment still needs a document-sync pass: no order to check, no labels at
 * all yet, or a label was saved (e.g. tracking number only) but never got its own PDF url.
 */
export function needsShipmentDocumentsSync(fulfillment: {
  data?: Record<string, unknown> | null
  labels?: Array<{ label_url?: string | null }> | null
}): boolean {
  if (!fulfillment.data?.orderId) return false
  return !fulfillment.labels?.some((label) => label?.label_url)
}
