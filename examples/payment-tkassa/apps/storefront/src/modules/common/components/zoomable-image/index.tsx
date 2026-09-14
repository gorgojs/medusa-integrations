"use client"

import { Dialog, Transition } from "@headlessui/react"
import { useTranslations } from "next-intl"
import X from "@modules/common/icons/x"
import Image from "next/image"
import { Fragment, useCallback, useRef, useState } from "react"

type ZoomableImageProps = {
  src: string
  alt: string
  sizes?: string
  priority?: boolean
  fetchPriority?: "high" | "low" | "auto"
  className?: string
}

const ZoomableImage = ({
  src,
  alt,
  sizes,
  priority,
  fetchPriority,
  className,
}: ZoomableImageProps) => {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{
    x: number
    y: number
    ox: number
    oy: number
  } | null>(null)
  const isDragging = useRef(false)

  const close = useCallback(() => {
    setIsOpen(false)
    setZoomed(false)
    setOffset({ x: 0, y: 0 })
  }, [])

  const handleImageClick = useCallback(() => {
    if (isDragging.current) return
    setZoomed((z) => {
      if (z) setOffset({ x: 0, y: 0 })
      return !z
    })
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!zoomed) return
      isDragging.current = false
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offset.x,
        oy: offset.y,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [zoomed, offset]
  )

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }, [])

  const handlePointerUp = useCallback(() => {
    dragStart.current = null
    setTimeout(() => {
      isDragging.current = false
    }, 0)
  }, [])

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-zoom-in"
        onClick={() => setIsOpen(true)}
        aria-label={t("ImageGallery.openFullImage")}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          fetchPriority={fetchPriority}
          sizes={sizes}
          className={className}
          style={{ objectFit: "cover" }}
        />
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/85" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center" onClick={close} onWheel={(e) => { if (!e.ctrlKey) close() }}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="relative w-full h-full flex items-center justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={close}
                  className="pointer-events-auto absolute top-4 end-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label={t("Common.close")}
                >
                  <X size={18} />
                </button>

                <div
                  className="pointer-events-auto select-none relative w-[90vw] h-[90vh] max-w-5xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomed ? 2 : 1})`,
                      transition: dragStart.current ? "none" : "transform 0.2s ease",
                      cursor: zoomed ? "grab" : "zoom-in",
                      willChange: "transform",
                    }}
                    onClick={handleImageClick}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  >
                    <div className="relative w-[90vw] h-[90vh] max-w-5xl">
                      <Image
                        src={src}
                        alt={alt}
                        fill
                        priority
                        sizes="90vw"
                        style={{ objectFit: "contain" }}
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default ZoomableImage
