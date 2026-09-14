import { useEffect } from "react"

const useScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return

    const html = document.documentElement
    const scrollbarWidth = window.innerWidth - html.clientWidth
    const prevOverflow = html.style.overflow
    const prevPaddingRight = html.style.paddingRight

    html.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      html.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      html.style.overflow = prevOverflow
      html.style.paddingRight = prevPaddingRight
    }
  }, [locked])
}

export default useScrollLock
