"use client"

import { resetOnboardingState } from "@lib/data/onboarding"
import { Button, Container, Text } from "@medusajs/ui"
import { useTranslations } from "next-intl"

const OnboardingCta = ({ orderId }: { orderId: string }) => {
  const t = useTranslations("OnboardingCta")

  return (
    <Container className="max-w-4xl h-full bg-ui-bg-subtle w-full">
      <div className="flex flex-col gap-y-4 center p-4 md:items-center">
        <Text className="text-ui-fg-base text-xl">
          {t("orderCreated")} 🎉
        </Text>
        <Text className="text-ui-fg-subtle text-small-regular">
          {t("completeSetup")}
        </Text>
        <Button
          className="w-fit"
          size="large"
          onClick={() => resetOnboardingState(orderId)}
        >
          {t("completeInAdmin")}
        </Button>
      </div>
    </Container>
  )
}

export default OnboardingCta
