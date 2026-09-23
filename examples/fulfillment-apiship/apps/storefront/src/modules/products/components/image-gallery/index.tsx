"use client"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import type { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Image from "next/image"
import ZoomableImage from "@modules/common/components/zoomable-image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({ images }: ImageGalleryProps) => {
  const t = useTranslations("ImageGallery")
  const [activeIndex, setActiveIndex] = useState(0)
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0)
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const mobileSliderRef = useRef<HTMLDivElement | null>(null)
  const mobileSlideRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    imageRefs.current.forEach((ref, index) => {
      if (!ref) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index)
          }
        },
        { threshold: 0.5 }
      )
      observer.observe(ref)
      observers.push(observer)
    })
    return () => {
      observers.forEach((obs) => obs.disconnect())
    }
  }, [images])

  useEffect(() => {
    const slider = mobileSliderRef.current
    if (!slider) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = mobileSlideRefs.current.findIndex(
              (el) => el === entry.target
            )
            if (index !== -1) {
              setMobileActiveIndex(index)
            }
          }
        })
      },
      { root: slider, threshold: 0.6 }
    )

    mobileSlideRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [images])

  const handleThumbnailClick = (index: number) => {
    imageRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }

  const handleDotClick = (index: number) => {
    mobileSlideRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    })
  }

  return (
    <>
      <div className="hidden md:flex items-start gap-3">
        <div className="flex flex-col gap-3 w-[101px] shrink-0 sticky top-20 self-start">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => handleThumbnailClick(index)}
              className={`relative w-full h-[118px] overflow-hidden rounded-lg transition-all cursor-pointer ${
                activeIndex === index
                  ? "ring-1 ring-ui-border-interactive"
                  : "hover:ring-1 hover:ring-ui-bg-subtle"
              }`}
            >
              {!!image.url && (
                <Image
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="101px"
                  style={{ objectFit: "cover" }}
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-col flex-1 gap-y-4">
          {images.map((image, index) => (
            <Container
              key={image.id}
              ref={(el) => {
                imageRefs.current[index] = el
              }}
              className="relative aspect-[29/34] w-full overflow-hidden bg-ui-bg-subtle"
              id={image.id}
            >
              {!!image.url && (
                <ZoomableImage
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  priority={index === 0}
                  fetchPriority={index === 0 ? "high" : undefined}
                  sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                  className="rounded-rounded"
                />
              )}
            </Container>
          ))}
        </div>
      </div>

      <div className="md:hidden relative">
        <div
          ref={mobileSliderRef}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar shadow-elevation-card-rest rounded-lg"
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              ref={(el) => {
                mobileSlideRefs.current[index] = el
              }}
              className="relative aspect-[29/34] w-full shrink-0 snap-center overflow-hidden bg-ui-bg-subtle"
            >
              {!!image.url && (
                <ZoomableImage
                  src={image.url}
                  alt={`Product image ${index + 1}`}
                  priority={index === 0}
                  fetchPriority={index === 0 ? "high" : undefined}
                  sizes="100vw"
                  className="rounded-rounded"
                />
              )}
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center z-10">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => handleDotClick(index)}
                aria-label={t("goToImage", { index: index + 1 })}
                aria-current={mobileActiveIndex === index}
                className="h-6 w-6 flex items-center justify-center cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full transition-all border border-ui-border-strong ${
                    mobileActiveIndex === index
                      ? "bg-ui-bg-overlay"
                      : "bg-transparent"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default ImageGallery
