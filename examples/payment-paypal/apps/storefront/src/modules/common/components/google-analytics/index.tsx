"use client"

import { GoogleAnalytics as GtagScripts } from "@next/third-parties/google"
import { useEffect, useState } from "react"

const IDLE_TIMEOUT = 3000

const WAKE_EVENTS = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
] as const

type GoogleAnalyticsProps = {
  gaId: string
}

const GoogleAnalytics = ({ gaId }: GoogleAnalyticsProps) => {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    window.dataLayer = window.dataLayer || []

    let idleHandle: number | undefined
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    const stopWaiting = () => {
      if (idleHandle !== undefined) {
        window.cancelIdleCallback(idleHandle)
        idleHandle = undefined
      }

      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle)
        timeoutHandle = undefined
      }

      for (const event of WAKE_EVENTS) {
        window.removeEventListener(event, load)
      }
    }

    const load = () => {
      stopWaiting()
      setShouldLoad(true)
    }

    for (const event of WAKE_EVENTS) {
      window.addEventListener(event, load, { once: true, passive: true })
    }

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(load, { timeout: IDLE_TIMEOUT })
    } else {
      timeoutHandle = setTimeout(load, IDLE_TIMEOUT)
    }

    return stopWaiting
  }, [])

  if (!shouldLoad) {
    return null
  }

  return <GtagScripts gaId={gaId} />
}

export default GoogleAnalytics
