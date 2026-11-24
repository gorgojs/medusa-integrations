"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import type { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import type { FetchError } from "@medusajs/js-sdk"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removeCartId,
  removePendingCustomer,
  setAuthToken,
  setPendingCustomer,
  setVerificationRequested,
  wasVerificationRequested,
} from "./cookies"
import { getLocale } from "./locale-actions"
import { defaultLocale } from "@i18n/config"
import { validatePassword } from "@lib/util/password"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    // A guest has no token, and asking Medusa anyway costs a 401 per page.
    if (!("authorization" in authHeaders)) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag, { expire: 0 })

  return updateRes
}

export const retrieveCustomerAddresses =
  async (): Promise<HttpTypes.StoreCustomerAddress[] | null> => {
    const authHeaders = await getAuthHeaders()

    // A guest has no token, and asking Medusa anyway costs a 401 per page.
    if (!("authorization" in authHeaders)) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("addresses")),
    }

    return await sdk.client  
      .fetch<{ addresses: HttpTypes.StoreCustomerAddress[] }>(`/store/customers/me/addresses`, {
        method: "GET", 
        query: { 
          fields: "*addresses",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ addresses }) => addresses)
      .catch(() => null)
  }

/**
 * What the sign-in and sign-up forms render after a submit. `error` holds a raw
 * message or one of the storefront's own codes, which `ErrorMessage` resolves.
 */
export type CustomerAuthState =
  | { state: "error"; error: string }
  | { state: "verification_required"; email: string }
  | { state: "success" }
  | null

// Medusa's answer to registering an email that already has an identity, for
// example an Admin user or a customer who signed up before.
const IDENTITY_EXISTS = "Identity with email already exists"

export async function signup(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const locale = (await getLocale()) ?? defaultLocale

  // Medusa accepts any password, so this is the only gate there is. It has to
  // be the same one the reset flow applies, or a password accepted here would
  // be rejected when the customer later resets it.
  const passwordError = validatePassword(password)
  if (passwordError) {
    return { state: "error", error: passwordError }
  }

  let identityExists = false

  try {
    await sdk.auth.register("customer", "emailpass", { email, password })
  } catch (error) {
    const fetchError = error as FetchError
    // An existing identity is not a dead end: signing in with its password
    // still links a customer record to it below.
    if (
      fetchError.statusText !== "Unauthorized" ||
      fetchError.message !== IDENTITY_EXISTS
    ) {
      return { state: "error", error: String(error) }
    }
    identityExists = true
  }

  // The customer record is created while signing in, which waits for the
  // email to be confirmed when the backend requires that.
  await setPendingCustomer({
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
    locale,
  })

  const result = await completeLogin(email, password)

  // Report a taken address rather than a wrong password to someone who never
  // meant to sign in.
  if (identityExists && result?.state === "error") {
    return { state: "error", error: IDENTITY_EXISTS }
  }

  return result
}

export async function requestPasswordReset(email: string) {
  const locale = (await getLocale()) ?? defaultLocale

  await sdk.auth.resetPassword("customer", "emailpass", {
    identifier: email,
    metadata: { locale },
  } as Parameters<typeof sdk.auth.resetPassword>[2])
}

export type PasswordResetState = {
  success: boolean
  error: string | null
}

/**
 * Asks Medusa to email a reset link.
 *
 * Medusa answers 201 whether or not the address has an account, and only emits
 * `auth.password_reset` when it finds an `emailpass` identity. So an address
 * that checked out as a guest, or never registered, gets no email and this
 * still reports success. That is deliberate: telling the two apart would turn
 * the form into a way of discovering which addresses are registered.
 *
 * A thrown error means something else went wrong, the backend being
 * unreachable for instance, and is reported. Reporting success there would hide
 * a real outage behind the same message as the silent case.
 */
export async function requestPasswordResetForm(
  _currentState: unknown,
  formData: FormData
): Promise<PasswordResetState> {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    return { success: false, error: "invalidEmail" }
  }

  try {
    await requestPasswordReset(email)
  } catch (error) {
    console.error("[requestPasswordReset]", error)
    return { success: false, error: "requestFailed" }
  }

  return { success: true, error: null }
}

/**
 * Completes the reset with the token from the email. Medusa accepts the token
 * once, so a second submit of the same link fails and the form says so.
 */
export async function resetPassword(
  _currentState: unknown,
  formData: FormData
): Promise<PasswordResetState> {
  const token = String(formData.get("token") ?? "")
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirm_password") ?? "")

  if (!token) {
    return { success: false, error: "invalidResetLink" }
  }

  const passwordError = validatePassword(password, confirmPassword)
  if (passwordError) {
    return { success: false, error: passwordError }
  }

  try {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      { password },
      token
    )
  } catch (error) {
    console.error("[resetPassword]", error)
    return { success: false, error: "invalidResetLink" }
  }

  return { success: true, error: null }
}

export async function login(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  return completeLogin(email, password)
}

/**
 * Signs the customer in and makes sure a customer record exists. The backend's
 * answer decides the path, so the storefront works whether or not
 * `CUSTOMER_EMAIL_VERIFICATION` is on.
 */
async function completeLogin(
  email: string,
  password: string
): Promise<CustomerAuthState> {
  let result: Awaited<ReturnType<typeof sdk.auth.login>>

  try {
    result = await sdk.auth.login("customer", "emailpass", { email, password })
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  // Third-party providers answer with a redirect `location`, and emailpass
  // with MFA answers with a challenge. The storefront supports neither.
  if (typeof result === "object" && "location" in result) {
    return { state: "error", error: "Unsupported login method" }
  }

  if (
    typeof result === "object" &&
    "verification_required" in result &&
    result.verification_required
  ) {
    if (!(await wasVerificationRequested(email))) {
      try {
        await requestVerificationEmail(email, result.token)
        await setVerificationRequested(email)
      } catch (error) {
        // The customer gets another email on the next sign-in attempt.
        console.error("[requestVerificationEmail]", error)
      }
    }
    return { state: "verification_required", email }
  }

  if (typeof result !== "string") {
    return { state: "error", error: "Unsupported login method" }
  }

  let token = result

  // Right after sign-up, or after confirming the email of a brand-new account,
  // the token belongs to an identity with no customer yet. `/store/customers/me`
  // rejects such a token, which is how we tell.
  const customerExists = await sdk.store.customer
    .retrieve({}, { authorization: `Bearer ${token}` })
    .then(() => true)
    .catch(() => false)

  if (!customerExists) {
    const pending = await getPendingCustomer()
    const locale = pending?.locale ?? (await getLocale()) ?? defaultLocale

    try {
      await sdk.store.customer.create(
        {
          email,
          first_name: pending?.first_name,
          last_name: pending?.last_name,
          phone: pending?.phone,
          metadata: { locale },
        },
        {},
        { authorization: `Bearer ${token}` }
      )

      // The earlier token carries no customer id. A fresh one does.
      token = (await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })) as string
    } catch (error) {
      return { state: "error", error: String(error) }
    }
  }

  // Also when the account already existed: the form may have signed someone
  // into it, and its fields must not reach a later sign-up on this device.
  await removePendingCustomer()
  await setAuthToken(token)

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag, { expire: 0 })

  try {
    await transferCart()
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  return { state: "success" }
}

/**
 * Asks Medusa to email a confirmation link. The token from the login response
 * authenticates the request, since no customer exists yet. `actor_type` tells
 * the backend subscriber the link belongs on the storefront.
 */
async function requestVerificationEmail(email: string, token: string) {
  const locale = (await getLocale()) ?? defaultLocale

  await sdk.auth.verification.request(
    {
      entity_id: email,
      entity_type: "email",
      metadata: { locale, actor_type: "customer" },
    },
    { authorization: `Bearer ${token}` }
  )
}

/**
 * Confirms the email with the token from the link. The route needs no session,
 * so the link works on a different device from the one the customer signed up
 * on.
 */
export async function confirmEmailVerification(
  token: string
): Promise<{ success: boolean }> {
  try {
    await sdk.auth.verification.confirm({ code: token })
    return { success: true }
  } catch (error) {
    console.error("[confirmEmailVerification]", error)
    return { success: false }
  }
}

export async function signout() {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag, { expire: 0 })

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, { expire: 0 })

  const locale = (await getLocale()) ?? defaultLocale
  redirect(`/${locale}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag, { expire: 0 })
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    address_name: formData.get("address_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag, { expire: 0 })
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag, { expire: 0 })
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    address_name: formData.get("address_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag, { expire: 0 })
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
