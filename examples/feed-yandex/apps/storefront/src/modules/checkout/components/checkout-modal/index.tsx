"use client"

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { useTranslations } from "next-intl"

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function CheckoutModal({
  open,
  onClose,
  title,
  children,
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
            <DialogPanel className="relative w-full sm:w-[540px] max-h-[90dvh] overflow-y-auto bg-ui-bg-base rounded-t-xl sm:rounded-xl shadow-elevation-modal">
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
              <div className="px-6 pb-4">{children}</div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
