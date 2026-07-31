import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"
import { FetchError } from "@medusajs/js-sdk"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

const apishipOptionsQueryKey = (providerId?: string) =>
  ["apiship-options", providerId] as const
const apishipProvidersQueryKey = (providerId?: string) =>
  ["apiship-providers", providerId] as const
const getApishipAccountConnectionsQueryKey = (providerId?: string) =>
  ["apiship-account-connections", providerId] as const

export const useApishipOptions = (providerId?: string) => {
  const { data, ...rest } = useQuery<
    ApishipHttpTypes.AdminApishipOptionsResponse,
    FetchError
  >({
    queryKey: apishipOptionsQueryKey(providerId),
    queryFn: () =>
      sdk.client.fetch("/admin/apiship/options", {
        query: { provider_id: providerId },
      }),
  })

  return {
    ...data,
    ...rest,
  }
}

export const useApishipProviders = (providerId?: string) => {
  const { data, ...rest } = useQuery<
    ApishipHttpTypes.AdminApishipProviderListResponse,
    FetchError
  >({
    queryKey: apishipProvidersQueryKey(providerId),
    queryFn: () =>
      sdk.client.fetch("/admin/apiship/providers", {
        query: { provider_id: providerId },
      }),
  })

  return {
    ...data,
    ...rest,
  }
}

export const useApishipAccountConnections = (providerId?: string) => {
  const { data, ...rest } = useQuery<
    ApishipHttpTypes.AdminApishipAccountConnectionListResponse,
    FetchError
  >({
    queryKey: getApishipAccountConnectionsQueryKey(providerId),
    queryFn: () =>
      sdk.client.fetch("/admin/apiship/account-connections", {
        query: { provider_id: providerId },
      }),
  })

  return {
    ...data,
    ...rest,
  }
}

export const useApishipPoints = (
  // city: string,
  providerKey: string,
  providerId?: string
) => {
  const query = useQuery<
    ApishipHttpTypes.AdminApishipPointListResponse,
    FetchError
  >({
    // queryKey: ["apiship-points", city, providerKey],
    queryKey: ["apiship-points", providerKey, providerId],
    queryFn: () =>
      sdk.client.fetch("/admin/apiship/points", {
        method: "GET",
        query: {
          // filter: `availableOperation=[1,3];providerKey=${providerKey};city=${city}`,
          filter: `availableOperation=[1,3];providerKey=${providerKey}`,
          fields: "id,name,address",
          provider_id: providerId,
        },
      }),
    // enabled: !!city && !!providerKey,
    enabled: !!providerKey,
  })
  return {
    points: query.data?.points ?? [],
    ...query,
  }
}

export const useUpdateApishipOptions = (providerId?: string) => {
  const queryClient = useQueryClient()

  return useMutation<
    ApishipHttpTypes.AdminApishipOptionsResponse,
    FetchError,
    ApishipHttpTypes.AdminUpdateApishipOptions
  >({
    mutationFn: (payload) =>
      sdk.client.fetch("/admin/apiship/options", {
        method: "POST",
        query: { provider_id: providerId },
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(apishipOptionsQueryKey(providerId), data)
    },
  })
}

export const useCreateApishipConnection = (providerId?: string) => {
  const queryClient = useQueryClient()

  return useMutation<
    ApishipHttpTypes.AdminApishipConnectionResponse,
    FetchError,
    ApishipHttpTypes.AdminCreateApishipConnection
  >({
    mutationFn: (payload) =>
      sdk.client.fetch(`/admin/apiship/connections`, {
        method: "POST",
        query: { provider_id: providerId },
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(apishipOptionsQueryKey(providerId), (prev: ApishipHttpTypes.AdminApishipOptionsResponse) => {
        if (!prev?.apiship_options) {
          return prev
        }

        return {
          ...prev,
          apiship_options: {
            ...prev.apiship_options,
            connections: [...(prev.apiship_options.connections ?? []), data.connection],
          },
        }
      })
    },
  })
}

export const useUpdateApishipConnection = (
  id: string,
  providerId?: string
) => {
  const queryClient = useQueryClient()

  return useMutation<
    ApishipHttpTypes.AdminApishipConnectionResponse,
    FetchError,
    ApishipHttpTypes.AdminUpdateApishipConnection
  >({
    mutationFn: (payload) =>
      sdk.client.fetch(`/admin/apiship/connections/${id}`, {
        method: "POST",
        query: { provider_id: providerId },
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(apishipOptionsQueryKey(providerId), (prev: ApishipHttpTypes.AdminApishipOptionsResponse) => {
        if (!prev?.apiship_options) {
          return prev
        }

        return {
          ...prev,
          apiship_options: {
            ...prev.apiship_options,
            connections: (prev.apiship_options.connections ?? []).map((connection) =>
              connection.id === id ? data.connection : connection
            ),
          },
        }
      })
    },
  })
}

export const useDeleteApishipConnection = (
  id: string,
  providerId?: string
) => {
  const queryClient = useQueryClient()

  return useMutation<
    ApishipHttpTypes.AdminApishipConnectionDeleteResponse,
    FetchError
  >({
    mutationFn: () =>
      sdk.client.fetch(`/admin/apiship/connections/${id}`, {
        method: "DELETE",
        query: { provider_id: providerId },
      }),
    onSuccess: () => {
      queryClient.setQueryData(apishipOptionsQueryKey(providerId), (prev: ApishipHttpTypes.AdminApishipOptionsResponse) => {
        if (!prev?.apiship_options) {
          return prev
        }

        return {
          ...prev,
          apiship_options: {
            ...prev.apiship_options,
            connections: (prev.apiship_options.connections ?? []).filter(
              (connection) => connection.id !== id
            ),
          },
        }
      })
    },
  })
}
