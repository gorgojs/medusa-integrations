import { hashObject } from "../providers/fulfillment-apiship/utils/hash"

const POINTS_CHUNK_SIZE = 100
const POINTS_CONCURRENCY = 4

type PointsListsApi = {
  getListPoints: (params: {
    filter?: string
    fields?: string
    limit?: number
  }) => Promise<{ data: { rows?: Record<string, any>[] } }>
}

type PointsCache = {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<unknown>
}

export type FetchApishipPointsByIdsInput = {
  listsApi: PointsListsApi
  cache: PointsCache
  providerId: string
  pointIds: Array<number | string>
  fields?: string
}

export async function fetchApishipPointsByIds({
  listsApi,
  cache,
  providerId,
  pointIds,
  fields,
}: FetchApishipPointsByIdsInput): Promise<Record<string, any>[]> {
  const ids = Array.from(new Set(pointIds.map(String))).sort()

  const chunks: string[][] = []
  for (let index = 0; index < ids.length; index += POINTS_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + POINTS_CHUNK_SIZE))
  }

  const fetchChunk = async (chunk: string[]) => {
    const key = `apiship:points:${providerId}:${hashObject({ ids: chunk, fields })}`
    const cached = await cache.get(key)
    if (Array.isArray(cached)) {
      return cached as Record<string, any>[]
    }

    const { data } = await listsApi.getListPoints({
      filter: `id=[${chunk.join(",")}]`,
      limit: chunk.length,
      ...(fields !== undefined && { fields }),
    })

    const rows = data.rows ?? []
    await cache.set(key, rows)
    return rows
  }

  const points: Record<string, any>[] = []
  for (let index = 0; index < chunks.length; index += POINTS_CONCURRENCY) {
    const batch = await Promise.all(
      chunks.slice(index, index + POINTS_CONCURRENCY).map(fetchChunk)
    )
    for (const rows of batch) {
      points.push(...rows)
    }
  }

  return points
}
