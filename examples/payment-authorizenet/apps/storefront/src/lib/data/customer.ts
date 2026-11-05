"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import type { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"
import { getLocale } from "./locale-actions"
import { defaultLocale } from "@i18n/config"
import { validatePassword } from "@lib/util/password"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

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
  revalidateTag(cacheTag)

  return updateRes
}

export const retrieveCustomerAddresses =
  async (): Promise<HttpTypes.StoreCustomerAddress[] | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

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

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const locale = (await getLocale()) ?? defaultLocale

  // Medusa accepts any password, so this is the only gate there is. It has to
  // be the same one the reset flow applies, or a password accepted here would
  // be rejected when the customer later resets it.
  const passwordError = validatePassword(password)
  if (passwordError) {
    return passwordError
  }

  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
    metadata: { locale },
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()

    return createdCustomer
  } catch (error) {
    return String(error)
  }
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

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      })
  } catch (error) {
    return String(error)
  }

  try {
    await transferCart()
  } catch (error) {
    return String(error)
  }
}

export async function signout() {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

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
  revalidateTag(cartCacheTag)
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
      revalidateTag(customerCacheTag)
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
      revalidateTag(customerCacheTag)
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
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
