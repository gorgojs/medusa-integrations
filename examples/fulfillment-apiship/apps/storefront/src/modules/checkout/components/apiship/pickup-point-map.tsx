"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { useTranslations } from "next-intl"
import type { ApishipPoint } from "./types"

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

type PickupPointMapProps = {
  points: ApishipPoint[]
  isLoading: boolean
  selectedPointId: string | null
  onSelectPoint: (pointId: string) => void
  /** BCP 47 tag, passed through to the map's own labels. */
  lang: string
}

export default function PickupPointMap({
  points,
  isLoading,
  selectedPointId,
  onSelectPoint,
  lang,
}: PickupPointMapProps) {
  const t = useTranslations("Apiship")
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Map<string, { marker: any; el: HTMLDivElement }>>(
    new Map()
  )
  const readyRef = useRef<Promise<void> | null>(null)
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
    const map = mapRef.current
    for (const { marker } of Array.from(markersRef.current.values())) {
      try {
        map?.removeChild(marker)
      } catch {
        // The map is already gone, so the marker went with it.
      }
    }
    markersRef.current.clear()
  }, [])

  const paintSelection = useCallback(() => {
    for (const [id, { el }] of Array.from(markersRef.current.entries())) {
      const selected = id === selectedPointId
      el.dataset.selected = selected ? "true" : "false"
      el.style.background = selected ? "rgb(59 130 246)" : "white"
      el.style.borderColor = selected ? "rgb(29 78 216)" : "rgba(0,0,0,0.25)"
      el.style.zIndex = selected ? "2" : "1"
    }
  }, [selectedPointId])

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

      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer } = ymaps3
      const map = new YMap(containerRef.current, {
        location: { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
      })
      map.addChild(new YMapDefaultSchemeLayer({}))
      map.addChild(new YMapDefaultFeaturesLayer({}))

      mapRef.current = map
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
      readyRef.current = null
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
      if (!map || !ymaps3) return

      const { YMapMarker } = ymaps3
      clearMarkers()

      for (const point of points) {
        const el = document.createElement("div")
        el.style.width = "18px"
        el.style.height = "18px"
        el.style.background = "white"
        el.style.border = "2px solid rgba(0,0,0,0.25)"
        el.style.borderRadius = "50% 50% 50% 0"
        el.style.transform = "rotate(-45deg)"
        el.style.transformOrigin = "50% 50%"
        el.style.boxShadow = "0 2px 2px rgba(0,0,0,0.18)"
        el.style.cursor = "pointer"
        el.style.position = "relative"
        el.title = point.name ?? point.address ?? ""

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

        el.addEventListener("click", (event) => {
          event.preventDefault()
          event.stopPropagation()
          onSelectPointRef.current(point.id)
        })

        const marker = new YMapMarker(
          { coordinates: [point.lng, point.lat] },
          el
        )
        map.addChild(marker)
        markersRef.current.set(point.id, { marker, el })
      }

      try {
        map.setLocation({ center, zoom: DEFAULT_ZOOM })
      } catch {
        // A map torn down mid-update has nothing left to centre.
      }

      paintSelection()
    })()

    return () => {
      cancelled = true
    }
  }, [points, center, clearMarkers, paintSelection])

  useEffect(() => {
    paintSelection()
  }, [paintSelection])

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
