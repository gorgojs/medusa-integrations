import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"
import { FetchError } from "@medusajs/js-sdk"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

const apishipOptionsQueryKey = ["apiship-options"] as const
const apishipProvidersQueryKey = ["apiship-providers"] as const
const getApishipAccountConnectionsQueryKey = ["apiship-account-connections"] as const

export const useApishipOptions = () => {
  const { data, ...rest } = useQuery<
    ApishipHttpTypes.AdminApishipOptionsResponse,
    FetchError
  >({
    queryKey: apishipOptionsQueryKey,
    queryFn: () => sdk.client.fetch("/admin/apiship/options"),
  })

  return {
    ...data,
    ...rest,
  }
}

export const useApishipProviders = () => {
  const { data, ...rest } = useQuery<
    ApishipHttpTypes.AdminApishipProviderListResponse,
    FetchError
  >({
    queryKey: apishipProvidersQueryKey,
    queryFn: () => sdk.client.fetch("/admin/apiship/providers"),
  })

  return {
    ...data,
    ...rest,
  }
}

export const useApishipAccountConnections = () => {
  const { data, ...rest } = useQuery<
    ApishipHttpTypes.AdminApishipAccountConnectionListResponse,
    FetchError
  >({
    queryKey: getApishipAccountConnectionsQueryKey,
    queryFn: () => sdk.client.fetch("/admin/apiship/account-connections"),
  })

  return {
    ...data,
    ...rest,
  }
}

export const useApishipPoints = (
  // city: string,
  providerKey: string
) => {
  const query = useQuery<
    ApishipHttpTypes.AdminApishipPointListResponse,
    FetchError
  >({
    // queryKey: ["apiship-points", city, providerKey],
    queryKey: ["apiship-points", providerKey],
    queryFn: () =>
      sdk.client.fetch("/admin/apiship/points", {
        method: "GET",
        query: {
          // filter: `availableOperation=[1,3];providerKey=${providerKey};city=${city}`,
          filter: `availableOperation=[1,3];providerKey=${providerKey}`,
          limit: 0,
          fields: "id,name,address",
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

export const useUpdateApishipOptions = () => {
  const queryClient = useQueryClient()

  return useMutation<
    ApishipHttpTypes.AdminApishipOptionsResponse,
    FetchError,
    ApishipHttpTypes.AdminUpdateApishipOptions
  >({
    mutationFn: (payload) =>
      sdk.client.fetch("/admin/apiship/options", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(apishipOptionsQueryKey, data)
    },
  })
}

export const useCreateApishipConnection = () => {
  const queryClient = useQueryClient()

  return useMutation<
    ApishipHttpTypes.AdminApishipConnectionResponse,
    FetchError,
    ApishipHttpTypes.AdminCreateApishipConnection
  >({
    mutationFn: (payload) =>
      sdk.client.fetch(`/admin/apiship/connections`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(apishipOptionsQueryKey, (prev: ApishipHttpTypes.AdminApishipOptionsResponse) => {
        if (!prev?.apiship_options) {
          return prev
        }

        return {
          ...prev,
          apiship_options: {
            ...prev.apiship_options,
            settings: {
              ...prev.apiship_options.settings,
              connections: [
                ...(prev.apiship_options.settings?.connections ?? []),
                data.connection,
              ],
            },
          },
        }
      })
    },
  })
}

export const useUpdateApishipConnection = (
  id: string,
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
        body: payload,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(apishipOptionsQueryKey, (prev: ApishipHttpTypes.AdminApishipOptionsResponse) => {
        if (!prev?.apiship_options) {
          return prev
        }

        return {
          ...prev,
          apiship_options: {
            ...prev.apiship_options,
            settings: {
              ...prev.apiship_options.settings,
              connections: (prev.apiship_options.settings?.connections ?? []).map((connection) =>
                connection.id === id ? data.connection : connection
              ),
            },
          },
        }
      })
    },
  })
}

export const useDeleteApishipConnection = (
  id: string
) => {
  const queryClient = useQueryClient()

  return useMutation<
    ApishipHttpTypes.AdminApishipConnectionDeleteResponse,
    FetchError
  >({
    mutationFn: () =>
      sdk.client.fetch(`/admin/apiship/connections/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.setQueryData(apishipOptionsQueryKey, (prev: ApishipHttpTypes.AdminApishipOptionsResponse) => {
        if (!prev?.apiship_options) {
          return prev
        }

        return {
          ...prev,
          apiship_options: {
            ...prev.apiship_options,
            settings: {
              ...prev.apiship_options.settings,
              connections: (prev.apiship_options.settings?.connections ?? []).filter(
                (connection) => connection.id !== id
              ),
            },
          },
        }
      })
    },
  })
}
