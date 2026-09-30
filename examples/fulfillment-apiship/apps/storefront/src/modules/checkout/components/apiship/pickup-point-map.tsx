"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import type { ApishipPoint, ApishipProvider } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    ymaps3?: any
    __ymaps3_loading_promise__?: Promise<void>
  }
}

/** Moscow, where the demo warehouse is, so an empty map still opens somewhere useful. */
const DEFAULT_CENTER: [number, number] = [37.618423, 55.751244]
const DEFAULT_ZOOM = 10
const LOGO_MARKER_SIZE = 36
const LOGO_MARKER_SIZE_SELECTED = 48
const CLUSTER_MARKER_SIZE = 40
const CLUSTER_SPACING = 60
const CLUSTER_MAX_ZOOM = 16
const WORLD_PIXEL_SIZE = 256
const CLUSTER_BOUNDS_PADDING = 0.25
const CLUSTER_ZOOM_DURATION = 300
const HOVER_SCALE = 1.2
const Z_INDEX_BASE = 1
const Z_INDEX_SELECTED = 2
const Z_INDEX_HOVERED = 3
const CLUSTERER_PACKAGE = "@yandex/ymaps3-clusterer"
const CLUSTERER_VERSION = "0.0.12"

const BASE_TRANSFORMS: Record<string, string> = {
  logo: "translate(-50%, -50%)",
  pin: "rotate(-45deg)",
  cluster: "translate(-50%, -50%)",
}

type LngLat = [number, number]

type PointFeature = {
  type: "Feature"
  id: string
  geometry: { type: "Point"; coordinates: LngLat }
  properties: ApishipPoint
}

type MarkerEntry = { marker: any; el: HTMLDivElement }

type WorldPoint = { x: number; y: number }

type ClusterItem = { world: WorldPoint; features: PointFeature[] }

type ClustererObject = ClusterItem & { lnglat: LngLat; clusterId: string }

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

/**
 * Loads the Yandex Maps script once per page. Two modals opening in the same session would
 * otherwise each append a tag and race each other to define `window.ymaps3`.
 */
function loadYmaps3(apiKey: string, lang: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.__ymaps3_loading_promise__) return window.__ymaps3_loading_promise__

  const loading = new Promise<void>((resolve, reject) => {
    if (window.ymaps3) {
      resolve()
      return
    }

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

  loading.catch(() => {
    window.__ymaps3_loading_promise__ = undefined
  })

  window.__ymaps3_loading_promise__ = loading

  return loading
}

function loadClusterer(ymaps3: any) {
  ymaps3.import.registerCdn(
    "https://cdn.jsdelivr.net/npm/{package}",
    `${CLUSTERER_PACKAGE}@${CLUSTERER_VERSION}`
  )
  return ymaps3.import(CLUSTERER_PACKAGE)
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

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const clustererModuleRef = useRef<any>(null)
  const clustererRef = useRef<any>(null)
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const selectedPointIdRef = useRef(selectedPointId)
  const readyRef = useRef<Promise<void> | null>(null)
  const centeredPointsRef = useRef<ApishipPoint[] | null>(null)
  const [scriptFailed, setScriptFailed] = useState(false)
  // The click handler outlives the effect that created the marker, so it reads the
  // current callback rather than the one captured when the marker was drawn.
  const onSelectPointRef = useRef(onSelectPoint)
  useEffect(() => {
    onSelectPointRef.current = onSelectPoint
  }, [onSelectPoint])

  const center = useMemo<[number, number]>(() => {
    const first = points[0]
    return first ? [first.lng, first.lat] : DEFAULT_CENTER
  }, [points])

  const clearMarkers = useCallback(() => {
    const clusterer = clustererRef.current
    if (clusterer) {
      try {
        mapRef.current?.removeChild(clusterer)
      } catch {
        // The map is already gone, so the clusterer went with it.
      }
    }
    clustererRef.current = null
    markersRef.current.clear()
  }, [])

  const paintSelection = useCallback(() => {
    for (const [id, entry] of Array.from(markersRef.current.entries())) {
      entry.el.dataset.selected = String(id === selectedPointIdRef.current)
      paintMarker(entry)
    }
  }, [])

  useEffect(() => {
    if (!apiKey || !containerRef.current || mapRef.current) return

    let cancelled = false

    readyRef.current = (async () => {
      await loadYmaps3(apiKey, toYandexLang(lang))
      if (cancelled) return

      const ymaps3 = window.ymaps3
      if (!ymaps3 || !containerRef.current) return

      await ymaps3.ready
      if (cancelled) return

      const clustererModule = await loadClusterer(ymaps3)
      if (cancelled || !containerRef.current) return

      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3
      const map = new YMap(containerRef.current, {
        location: { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
      })
      map.addChild(new YMapDefaultSchemeLayer({}))
      map.addChild(new YMapDefaultFeaturesLayer({}))

      mapRef.current = map
      clustererModuleRef.current = clustererModule
    })().catch((e) => {
      console.error("Yandex map failed to start", e)
      if (!cancelled) setScriptFailed(true)
    })

    return () => {
      cancelled = true
      clearMarkers()
      try {
        mapRef.current?.destroy?.()
      } catch {
        // Destroying a map that never finished starting is not an error worth raising.
      }
      mapRef.current = null
      clustererModuleRef.current = null
      readyRef.current = null
      centeredPointsRef.current = null
    }
  }, [apiKey, lang, clearMarkers])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!readyRef.current) return
      await readyRef.current
      if (cancelled) return

      const map = mapRef.current
      const ymaps3 = window.ymaps3
      const clustererModule = clustererModuleRef.current
      if (!map || !ymaps3 || !clustererModule) return

      const { YMapMarker } = ymaps3
      const { YMapClusterer } = clustererModule
      clearMarkers()

      const features: PointFeature[] = points.map((point) => ({
        type: "Feature",
        id: point.id,
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
        properties: point,
      }))

      const hover = createHoverTracker()

      const clusterer = new YMapClusterer({
        method: clusterBySpacing(features, CLUSTER_SPACING),
        maxZoom: CLUSTER_MAX_ZOOM,
        features,
        onRender: () => hover.releaseStale(),
        marker: (feature: PointFeature) => {
          const point = feature.properties
          const icon = providers?.[point.providerKey ?? ""]?.icon
          const el = icon ? createLogoMarker(icon) : createPinMarker()
          el.title = point.name ?? point.address ?? ""
          el.dataset.selected = String(point.id === selectedPointIdRef.current)

          el.addEventListener("click", (event) => {
            event.preventDefault()
            event.stopPropagation()
            onSelectPointRef.current(point.id)
          })

          const entry: MarkerEntry = {
            marker: new YMapMarker(
              { coordinates: feature.geometry.coordinates },
              el
            ),
            el,
          }
          hover.bind(entry)
          paintMarker(entry)
          markersRef.current.set(point.id, entry)

          return entry.marker
        },
        cluster: (coordinates: LngLat, clusterFeatures: PointFeature[]) => {
          const el = createClusterMarker(clusterFeatures.length)

          el.addEventListener("click", (event) => {
            event.preventDefault()
            event.stopPropagation()
            zoomToFeatures(map, clusterFeatures)
          })

          const entry: MarkerEntry = {
            marker: new YMapMarker({ coordinates }, el),
            el,
          }
          hover.bind(entry)
          paintMarker(entry)

          return entry.marker
        },
      })
      map.addChild(clusterer)
      clustererRef.current = clusterer

      if (centeredPointsRef.current !== points) {
        try {
          map.setLocation({ center, zoom: DEFAULT_ZOOM })
          centeredPointsRef.current = points
        } catch {
          // A map torn down mid-update has nothing left to centre.
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [points, providers, center, clearMarkers])

  useEffect(() => {
    selectedPointIdRef.current = selectedPointId
    paintSelection()
  }, [selectedPointId, paintSelection])

  if (!apiKey || scriptFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ui-bg-subtle p-6">
        <Text className="text-ui-fg-muted text-center">
          {t("mapKeyMissing")}
        </Text>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ui-bg-base/80">
          <Loader className="h-5 w-5 animate-spin text-ui-fg-muted" />
        </div>
      )}

      {!isLoading && points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-ui-bg-base/80 p-6">
          <Text className="text-ui-fg-muted text-center">{t("noPoints")}</Text>
        </div>
      )}
    </div>
  )
}

function createLogoMarker(icon: string) {
  const el = document.createElement("div")
  el.dataset.kind = "logo"
  el.style.width = `${LOGO_MARKER_SIZE}px`
  el.style.height = `${LOGO_MARKER_SIZE}px`
  el.style.boxSizing = "border-box"
  el.style.padding = "4px"
  el.style.background = "white"
  el.style.borderRadius = "9999px"
  el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.22)"
  el.style.transform = BASE_TRANSFORMS.logo
  el.style.transition =
    "width 150ms ease, height 150ms ease, box-shadow 150ms ease, transform 150ms ease"
  el.style.cursor = "pointer"
  el.style.position = "relative"

  const img = document.createElement("img")
  img.src = icon
  img.alt = ""
  img.draggable = false
  img.style.display = "block"
  img.style.width = "100%"
  img.style.height = "100%"
  img.style.borderRadius = "9999px"
  img.style.pointerEvents = "none"
  el.appendChild(img)

  return el
}

function createPinMarker() {
  const el = document.createElement("div")
  el.dataset.kind = "pin"
  el.style.width = "18px"
  el.style.height = "18px"
  el.style.background = "white"
  el.style.border = "2px solid rgba(0,0,0,0.25)"
  el.style.borderRadius = "50% 50% 50% 0"
  el.style.transform = BASE_TRANSFORMS.pin
  el.style.transformOrigin = "50% 50%"
  el.style.boxShadow = "0 2px 2px rgba(0,0,0,0.18)"
  el.style.transition = "transform 150ms ease"
  el.style.cursor = "pointer"
  el.style.position = "relative"

  const dot = document.createElement("div")
  dot.style.width = "8px"
  dot.style.height = "8px"
  dot.style.boxSizing = "border-box"
  dot.style.background = "white"
  dot.style.border = "2px solid rgba(0,0,0,0.25)"
  dot.style.borderRadius = "9999px"
  dot.style.position = "absolute"
  dot.style.left = "50%"
  dot.style.top = "50%"
  dot.style.transform = "translate(-50%, -50%) rotate(45deg)"
  el.appendChild(dot)

  return el
}

function createClusterMarker(count: number) {
  const el = document.createElement("div")
  el.dataset.kind = "cluster"
  el.className =
    "relative flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-full border-2 border-ui-border-base bg-ui-bg-base px-2 shadow-[0_2px_6px_rgba(0,0,0,0.22)] txt-compact-small-plus text-ui-fg-base"
  el.textContent = String(count)
  el.style.minWidth = `${CLUSTER_MARKER_SIZE}px`
  el.style.height = `${CLUSTER_MARKER_SIZE}px`
  el.style.transform = BASE_TRANSFORMS.cluster
  el.style.transition = "transform 150ms ease"

  return el
}

function clusterBySpacing(features: PointFeature[], spacing: number) {
  let items: ClusterItem[] | null = null
  let cached: { zoom: number; objects: ClustererObject[] } | null = null

  return {
    render({ map }: { map: any }): ClustererObject[] {
      items ??= features.map((feature) => ({
        world: map.projection.toWorldCoordinates(feature.geometry.coordinates),
        features: [feature],
      }))

      const scale = (2 ** map.zoom / 2) * WORLD_PIXEL_SIZE

      if (!cached || cached.zoom !== map.zoom) {
        cached = {
          zoom: map.zoom,
          objects: mergeClose(items, spacing / scale).map((item) =>
            toClustererObject(map, item)
          ),
        }
      }

      const center = map.projection.toWorldCoordinates(map.center)

      return cached.objects.filter(
        ({ world }) =>
          Math.abs(world.x - center.x) * scale <= map.size.x &&
          Math.abs(world.y - center.y) * scale <= map.size.y
      )
    },
  }
}

function mergeClose(items: ClusterItem[], distance: number) {
  const cellOf = ({ x, y }: WorldPoint) =>
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
  const features: PointFeature[] = []
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

function toClustererObject(map: any, item: ClusterItem): ClustererObject {
  const [first] = item.features

  if (item.features.length === 1) {
    return { ...item, lnglat: first.geometry.coordinates, clusterId: first.id }
  }

  return {
    ...item,
    lnglat: map.projection.fromWorldCoordinates(item.world),
    clusterId: `cluster-${item.features.map(({ id }) => id).join(",")}`,
  }
}

function paintMarker({ marker, el }: MarkerEntry) {
  const selected = el.dataset.selected === "true"
  const hovered = el.dataset.hovered === "true"
  const baseTransform = BASE_TRANSFORMS[el.dataset.kind ?? ""] ?? ""

  const zIndex = selected ? Z_INDEX_SELECTED : Z_INDEX_BASE
  marker.update({ zIndex: hovered ? Z_INDEX_HOVERED : zIndex })
  el.style.transform = hovered
    ? `${baseTransform} scale(${HOVER_SCALE})`
    : baseTransform

  if (el.dataset.kind === "cluster") return

  if (el.dataset.kind === "logo") {
    const size = selected ? LOGO_MARKER_SIZE_SELECTED : LOGO_MARKER_SIZE
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    el.style.boxShadow = selected
      ? "0 4px 12px rgba(0,0,0,0.28)"
      : "0 2px 6px rgba(0,0,0,0.22)"
    return
  }

  el.style.background = selected ? "rgb(59 130 246)" : "white"
  el.style.borderColor = selected ? "rgb(29 78 216)" : "rgba(0,0,0,0.25)"
}

function createHoverTracker() {
  let hovered: MarkerEntry | null = null

  const setHovered = (entry: MarkerEntry | null) => {
    if (hovered === entry) return
    const previous = hovered
    hovered = entry

    if (previous) {
      previous.el.dataset.hovered = "false"
      paintMarker(previous)
    }
    if (entry) {
      entry.el.dataset.hovered = "true"
      paintMarker(entry)
    }
  }

  return {
    bind(entry: MarkerEntry) {
      entry.el.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse") setHovered(entry)
      })
      entry.el.addEventListener("pointerleave", () => {
        if (hovered === entry) setHovered(null)
      })
    },
    releaseStale() {
      if (hovered && !hovered.el.matches(":hover")) setHovered(null)
    },
  }
}

function zoomToFeatures(map: any, features: PointFeature[]) {
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity

  for (const { geometry } of features) {
    const [lng, lat] = geometry.coordinates
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }

  if (west === east && south === north) {
    map.setLocation({
      center: [west, south],
      zoom: CLUSTER_MAX_ZOOM + 1,
      duration: CLUSTER_ZOOM_DURATION,
    })
    return
  }

  const padLng = (east - west) * CLUSTER_BOUNDS_PADDING
  const padLat = (north - south) * CLUSTER_BOUNDS_PADDING

  map.setLocation({
    bounds: [
      [west - padLng, north + padLat],
      [east + padLng, south - padLat],
    ],
    duration: CLUSTER_ZOOM_DURATION,
  })
}
