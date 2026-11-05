"use client"

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { ArrowLeft, XMark } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useTranslations } from "next-intl"

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /**
   * Shows a back arrow before the title, for a sheet that walks through steps. A wide
   * sheet has no title bar, so it draws `CheckoutModalBackButton` itself where it fits.
   */
  onBack?: () => void
  /**
   * Hands the whole sheet to content that fills it, such as a map. The title is kept for
   * assistive technology only and the close button floats in the corner.
   */
  wide?: boolean
}

export function CheckoutModalBackButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  const t = useTranslations("CheckoutPage")

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("back")}
      className={clx(
        "text-ui-fg-base hover:text-ui-fg-subtle transition-colors",
        className
      )}
      data-testid="checkout-modal-back"
    >
      <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
    </button>
  )
}

export function CheckoutModal({
  open,
  onClose,
  title,
  children,
  onBack,
  wide = false,
}: CheckoutModalProps) {
  const t = useTranslations("Common")

  return (
    <Transition show={open}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px]"
            aria-hidden="true"
          />
        </TransitionChild>

        {/* Panel wrapper — bottom on mobile, centered on sm+ */}
        <div className="fixed inset-0 flex items-end sm:items-center justify-center">
          <TransitionChild
            enter="ease-out duration-250"
            enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          >
            {wide ? (
              <DialogPanel className="relative flex h-[85dvh] w-full flex-col overflow-hidden bg-ui-bg-base rounded-t-xl sm:h-[80dvh] sm:w-[calc(100vw-4rem)] sm:max-w-[1200px] sm:rounded-xl shadow-elevation-modal">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("close")}
                  className="absolute end-3 top-3 z-20 rounded-full bg-ui-bg-base p-1.5 text-ui-fg-muted shadow-elevation-card-rest hover:text-ui-fg-base transition-colors"
                >
                  <XMark />
                </button>
                <div className="flex min-h-0 flex-1">{children}</div>
              </DialogPanel>
            ) : (
              <DialogPanel className="relative w-full sm:w-[540px] max-h-[90dvh] overflow-y-auto bg-ui-bg-base rounded-t-xl sm:rounded-xl shadow-elevation-modal">
                {onBack ? (
                  <div className="flex flex-col gap-y-3 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <CheckoutModalBackButton onClick={onBack} />
                      <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("close")}
                        className="text-ui-fg-muted hover:text-ui-fg-base transition-colors p-0.5"
                      >
                        <XMark />
                      </button>
                    </div>
                    <DialogTitle className="txt-xlarge text-ui-fg-base">
                      {title}
                    </DialogTitle>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-6 py-4">
                    <DialogTitle className="txt-xlarge text-ui-fg-base">
                      {title}
                    </DialogTitle>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={t("close")}
                      className="text-ui-fg-muted hover:text-ui-fg-base transition-colors p-0.5"
                    >
                      <XMark />
                    </button>
                  </div>
                )}
                <div className="px-6 pb-4">{children}</div>
              </DialogPanel>
            )}
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
