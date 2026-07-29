import { getApishipConnectionsWorkflow } from "../../../../workflows/get-apiship-connections"

export const refetchConnection = async (
  connectionId: string,
  providerId?: string
) => {
  const { result } = await getApishipConnectionsWorkflow().run({
    input: {
      id: connectionId,
      provider_id: providerId
    }
  })
  return result[0]
}
