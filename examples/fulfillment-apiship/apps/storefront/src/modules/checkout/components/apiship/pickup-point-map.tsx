"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom"
import Image from "next/image"
import { Loader } from "@medusajs/icons"
import { Text, clx } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import type { LngLat, YMapLocationRequest } from "@yandex/ymaps3-types"
import type {
  ClustererObject,
  Feature,
  IClusterMethod,
  RenderProps,
} from "@yandex/ymaps3-clusterer"
import type { ApishipPoint, ApishipProvider } from "types/apiship"

/** Moscow, where the demo warehouse is, so an empty map still opens somewhere useful. */
const DEFAULT_CENTER: LngLat = [37.618423, 55.751244]
const DEFAULT_ZOOM = 10
const POINT_ZOOM = 15
const CLUSTER_SPACING = 60
const CLUSTER_MAX_ZOOM = 16
const BOUNDS_PADDING = 0.25
const ZOOM_DURATION = 300
const WORLD_PIXEL_SIZE = 256
const Z_INDEX_SELECTED = 1

/**
 * Yandex Maps takes a full locale and rejects a bare language tag with a 400, so the
 * storefront's own locale is mapped onto the four the map supports.
 */
const YANDEX_LANGS: Record<string, string> = {
  en: "en_US",
  ru: "ru_RU",
  tr: "tr_TR",
  uk: "uk_UA",
}

const toYandexLang = (locale: string) =>
  YANDEX_LANGS[locale.split(/[-_]/)[0].toLowerCase()] ?? "en_US"

function loadYmaps3Script(apiKey: string, lang: string) {
  if (typeof ymaps3 !== "undefined") return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(
      apiKey
    )}&lang=${encodeURIComponent(lang)}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      reject(new Error("Failed to load the Yandex Maps script"))
    }
    document.head.appendChild(script)
  })
}

async function loadMapComponents(apiKey: string, lang: string) {
  await loadYmaps3Script(apiKey, lang)
  await ymaps3.ready

  const [{ reactify }, clusterer] = await Promise.all([
    ymaps3.import("@yandex/ymaps3-reactify"),
    import("@yandex/ymaps3-clusterer"),
  ])

  const bound = reactify.bindTo(React, ReactDOM)
  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } =
    bound.module(ymaps3)
  const { YMapClusterer } = bound.module(clusterer)

  return {
    YMap,
    YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer,
    YMapMarker,
    YMapClusterer,
  }
}

type MapComponents = Awaited<ReturnType<typeof loadMapComponents>>

let mapComponentsLoading: Promise<MapComponents> | null = null

const getMapComponents = (apiKey: string, lang: string) => {
  mapComponentsLoading ??= loadMapComponents(apiKey, lang).catch((e) => {
    mapComponentsLoading = null
    throw e
  })
  return mapComponentsLoading
}

const locationForPoints = (
  points: ApishipPoint[],
  selectedPointId: string | null
): YMapLocationRequest => {
  const selected = points.find((point) => point.id === selectedPointId)

  if (selected) {
    return { center: [selected.lng, selected.lat], zoom: POINT_ZOOM }
  }

  if (!points.length) {
    return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }
  }

  return locationFor(
    points.map((point) => [point.lng, point.lat]),
    POINT_ZOOM
  )
}

const locationFor = (
  coordinates: LngLat[],
  pointZoom: number,
  duration?: number
): YMapLocationRequest => {
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity

  for (const [lng, lat] of coordinates) {
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }

  if (west === east && south === north) {
    return { center: [west, south], zoom: pointZoom, duration }
  }

  const padLng = (east - west) * BOUNDS_PADDING
  const padLat = (north - south) * BOUNDS_PADDING

  return {
    bounds: [
      [west - padLng, north + padLat],
      [east + padLng, south - padLat],
    ],
    duration,
  }
}

type ClusterItem = {
  world: { x: number; y: number }
  features: Feature[]
}

function mergeClose(items: ClusterItem[], distance: number) {
  const cellOf = ({ x, y }: ClusterItem["world"]) =>
    [Math.floor(x / distance), Math.floor(y / distance)] as const
  let current = items

  for (;;) {
    const cells = new Map<string, ClusterItem[]>()
    for (const item of current) {
      const [cx, cy] = cellOf(item.world)
      const key = `${cx}:${cy}`
      const cell = cells.get(key)
      if (cell) cell.push(item)
      else cells.set(key, [item])
    }

    const taken = new Set<ClusterItem>()
    const next: ClusterItem[] = []

    for (const item of current) {
      if (taken.has(item)) continue
      taken.add(item)

      const group = [item]
      const [cx, cy] = cellOf(item.world)

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (const other of cells.get(`${cx + dx}:${cy + dy}`) ?? []) {
            if (taken.has(other)) continue
            const gap = Math.hypot(
              other.world.x - item.world.x,
              other.world.y - item.world.y
            )
            if (gap >= distance) continue
            taken.add(other)
            group.push(other)
          }
        }
      }

      next.push(group.length === 1 ? item : combine(group))
    }

    if (next.length === current.length) return next
    current = next
  }
}

function combine(group: ClusterItem[]): ClusterItem {
  const features: Feature[] = []
  let x = 0
  let y = 0

  for (const item of group) {
    const weight = item.features.length
    x += item.world.x * weight
    y += item.world.y * weight
    for (const feature of item.features) features.push(feature)
  }

  return { world: { x: x / features.length, y: y / features.length }, features }
}

function clusterBySpacing(
  features: Feature[],
  spacing: number
): IClusterMethod {
  let items: ClusterItem[] | null = null
  let cached: { zoom: number; objects: ClustererObject[] } | null = null

  return {
    render({ map }: RenderProps) {
      items ??= features.map((feature) => ({
        world: map.projection.toWorldCoordinates(feature.geometry.coordinates),
        features: [feature],
      }))

      const scale = (2 ** map.zoom / 2) * WORLD_PIXEL_SIZE

      if (!cached || cached.zoom !== map.zoom) {
        cached = {
          zoom: map.zoom,
          objects: mergeClose(items, spacing / scale).map(
            ({ world, features }) =>
              features.length === 1
                ? {
                    world,
                    features,
                    lnglat: features[0].geometry.coordinates,
                    clusterId: features[0].id,
                  }
                : {
                    world,
                    features,
                    lnglat: map.projection.fromWorldCoordinates(world),
                    clusterId: `cluster-${features
                      .map(({ id }) => id)
                      .join(",")}`,
                  }
          ),
        }
      }

      const [centerLng, centerLat] = map.center
      const center = map.projection.toWorldCoordinates([centerLng, centerLat])

      return cached.objects.filter(
        ({ world }) =>
          Math.abs(world.x - center.x) * scale <= map.size.x &&
          Math.abs(world.y - center.y) * scale <= map.size.y
      )
    },
  }
}

const hoverScale = "[@media(hover:hover)]:hover:scale-[1.2]"

function PointMarker({
  label,
  icon,
  selected,
  onSelect,
}: {
  label: string
  icon?: string
  selected: boolean
  onSelect: () => void
}) {
  if (icon) {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={selected}
        onClick={onSelect}
        className={clx(
          "relative flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ui-bg-base p-1 outline-none transition-[width,height,box-shadow,transform] duration-150 focus-visible:shadow-borders-focus",
          hoverScale,
          selected
            ? "size-12 shadow-[0_4px_12px_rgba(0,0,0,0.28)]"
            : "size-9 shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
        )}
      >
        <Image
          src={icon}
          alt=""
          width={48}
          height={48}
          draggable={false}
          className="pointer-events-none size-full rounded-full"
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={clx(
        "relative block size-[18px] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-[50%_50%_50%_0] border-2 shadow-[0_2px_2px_rgba(0,0,0,0.18)] outline-none transition-transform duration-150 focus-visible:shadow-borders-focus",
        hoverScale,
        selected
          ? "border-ui-border-interactive bg-ui-bg-interactive"
          : "border-ui-border-strong bg-ui-bg-base"
      )}
    >
      <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ui-border-strong bg-ui-bg-base" />
    </button>
  )
}

function ClusterMarker({
  count,
  onZoom,
}: {
  count: number
  onZoom: () => void
}) {
  return (
    <button
      type="button"
      onClick={onZoom}
      className={clx(
        "relative flex h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center whitespace-nowrap rounded-full border-2 border-ui-border-base bg-ui-bg-base px-2 shadow-[0_2px_6px_rgba(0,0,0,0.22)] outline-none transition-transform duration-150 txt-compact-small-plus text-ui-fg-base focus-visible:shadow-borders-focus",
        hoverScale
      )}
    >
      {count}
    </button>
  )
}

type PickupPointMapProps = {
  points: ApishipPoint[]
  isLoading: boolean
  selectedPointId: string | null
  providers?: Record<string, ApishipProvider>
  onSelectPoint: (pointId: string) => void
  /** BCP 47 tag, passed through to the map's own labels. */
  lang: string
}

export default function PickupPointMap({
  points,
  isLoading,
  selectedPointId,
  providers,
  onSelectPoint,
  lang,
}: PickupPointMapProps) {
  const t = useTranslations("Apiship")
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

  const [components, setComponents] = useState<MapComponents | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [location, setLocation] = useState<YMapLocationRequest>(() =>
    locationForPoints(points, selectedPointId)
  )
  const selectedPointIdRef = useRef(selectedPointId)
  const onSelectPointRef = useRef(onSelectPoint)

  useEffect(() => {
    selectedPointIdRef.current = selectedPointId
    onSelectPointRef.current = onSelectPoint
  }, [selectedPointId, onSelectPoint])

  useEffect(() => {
    if (!apiKey) return

    let cancelled = false

    getMapComponents(apiKey, toYandexLang(lang))
      .then((loaded) => {
        if (!cancelled) setComponents(loaded)
      })
      .catch((e) => {
        console.error("Yandex map failed to start", e)
        if (!cancelled) setLoadFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, lang])

  const pointsById = useMemo(
    () => new Map(points.map((point) => [point.id, point])),
    [points]
  )

  const features = useMemo<Feature[]>(
    () =>
      points.map((point) => ({
        type: "Feature",
        id: point.id,
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      })),
    [points]
  )

  const method = useMemo(
    () => clusterBySpacing(features, CLUSTER_SPACING),
    [features]
  )

  useEffect(() => {
    setLocation(locationForPoints(points, selectedPointIdRef.current))
  }, [points])

  const zoomToCluster = useCallback((clusterFeatures: Feature[]) => {
    setLocation(
      locationFor(
        clusterFeatures.map((feature) => feature.geometry.coordinates),
        CLUSTER_MAX_ZOOM + 1,
        ZOOM_DURATION
      )
    )
  }, [])

  const renderMarker = useCallback(
    (feature: Feature) => {
      const point = pointsById.get(feature.id)
      if (!components || !point) return <></>

      const selected = point.id === selectedPointId

      return (
        <components.YMapMarker
          coordinates={feature.geometry.coordinates}
          zIndex={selected ? Z_INDEX_SELECTED : 0}
        >
          <PointMarker
            label={point.name ?? point.address ?? ""}
            icon={providers?.[point.providerKey ?? ""]?.icon}
            selected={selected}
            onSelect={() => onSelectPointRef.current(point.id)}
          />
        </components.YMapMarker>
      )
    },
    [components, pointsById, providers, selectedPointId]
  )

  const renderCluster = useCallback(
    (coordinates: LngLat, clusterFeatures: Feature[]) => {
      if (!components) return <></>

      return (
        <components.YMapMarker coordinates={coordinates}>
          <ClusterMarker
            count={clusterFeatures.length}
            onZoom={() => zoomToCluster(clusterFeatures)}
          />
        </components.YMapMarker>
      )
    },
    [components, zoomToCluster]
  )

  if (!apiKey || loadFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ui-bg-subtle p-6">
        <Text className="text-ui-fg-muted text-center">
          {apiKey ? t("mapLoadFailed") : t("mapKeyMissing")}
        </Text>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {components && (
        <components.YMap location={location}>
          <components.YMapDefaultSchemeLayer />
          <components.YMapDefaultFeaturesLayer />
          <components.YMapClusterer
            method={method}
            features={features}
            marker={renderMarker}
            cluster={renderCluster}
            maxZoom={CLUSTER_MAX_ZOOM}
          />
        </components.YMap>
      )}

      {(isLoading || !components) && (
        <div className="absolute inset-0 flex items-center justify-center bg-ui-bg-base/80">
          <Loader className="h-5 w-5 animate-spin text-ui-fg-muted" />
        </div>
      )}

      {!isLoading && components && points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-ui-bg-base/80 p-6">
          <Text className="text-ui-fg-muted text-center">{t("noPoints")}</Text>
        </div>
      )}
    </div>
  )
}
