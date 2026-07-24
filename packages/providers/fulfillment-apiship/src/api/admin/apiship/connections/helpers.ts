import { getApishipConnectionsWorkflow } from "../../../../workflows/get-apiship-connections"

export const refetchConnection = async (
  connectionId: string
) => {
  const { result } = await getApishipConnectionsWorkflow().run({
    input: {
      id: connectionId
    }
  })
  return result[0]
}
