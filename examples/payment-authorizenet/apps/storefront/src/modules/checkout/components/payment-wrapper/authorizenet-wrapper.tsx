"use client"

import type { AuthorizeNetConfig } from "@lib/data/authorizenet"
import { ACCEPT_JS_URLS } from "@lib/util/accept-js"
import { EMPTY_CARD, type CardFields } from "@lib/util/card"
import Script from "next/script"
import { createContext, useContext, useMemo, useState } from "react"

type AuthorizeNetState = {
  config: AuthorizeNetConfig
  /** Accept.js has loaded and `window.Accept` can take a card. */
  acceptReady: boolean
  /** The card the customer is typing. The form writes it, the pay button reads it. */
  card: CardFields
  setCard: (card: CardFields) => void
}

const AuthorizeNetContext = createContext<AuthorizeNetState | null>(null)

/** The Authorize.net settings and the card form's state, or null outside a checkout that takes Authorize.net. */
export const useAuthorizeNet = () => useContext(AuthorizeNetContext)

type AuthorizeNetWrapperProps = {
  config: AuthorizeNetConfig
  children: React.ReactNode
}

/**
 * Loads Accept.js and holds the card form's fields, so the form in the payment section and the
 * pay button below it share one card. The card stays in this page's memory: Accept.js sends it to
 * Authorize.net and the shop's server only ever gets the token.
 */
const AuthorizeNetWrapper: React.FC<AuthorizeNetWrapperProps> = ({ config, children }) => {
  const [acceptReady, setAcceptReady] = useState(
    () => typeof window !== "undefined" && !!window.Accept
  )
  const [card, setCard] = useState<CardFields>(EMPTY_CARD)

  const value = useMemo(
    () => ({ config, acceptReady, card, setCard }),
    [config, acceptReady, card]
  )

  return (
    <AuthorizeNetContext.Provider value={value}>
      <Script
        src={ACCEPT_JS_URLS[config.environment]}
        strategy="afterInteractive"
        charSet="utf-8"
        onReady={() => setAcceptReady(true)}
      />
      {children}
    </AuthorizeNetContext.Provider>
  )
}

export default AuthorizeNetWrapper
