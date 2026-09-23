import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./layout";
import * as s from "./lib/styles";
import {
  type EmailLocale,
  DEFAULT_EMAIL_LOCALE,
  getEmailTranslator,
  STOREFRONT_URL,
  STORE_EMAIL,
} from "./i18n";

export type WelcomeEmailProps = {
  firstName?: string | null;
  shopUrl: string;
  locale?: EmailLocale;
};

export function WelcomeEmail({
  firstName,
  shopUrl,
  locale = DEFAULT_EMAIL_LOCALE,
}: WelcomeEmailProps) {
  const { t } = getEmailTranslator(locale);
  const ordersUrl = `${STOREFRONT_URL}/account/orders`;

  return (
    <EmailLayout preview={t("Welcome.preview")} locale={locale}>
      <Heading style={s.heading}>
        {firstName
          ? t("Welcome.headingWithName", { name: firstName })
          : t("Welcome.headingAnon")}
      </Heading>

      <Text style={s.paragraph}>{t("Welcome.body")}</Text>

      {/* A shopper who checked out as a guest before signing up keeps those
          orders on a separate customer record. Medusa's transfer flow is what
          links them, and this is the moment they are most likely to act on. */}
      <Text style={s.paragraph}>
        {t("Welcome.claimOrders")}{" "}
        <a href={ordersUrl} style={s.link}>
          {t("Welcome.claimOrdersLink")}
        </a>
      </Text>

      <Section style={s.buttonSection}>
        <Button href={shopUrl} style={s.button}>
          {t("Welcome.button")}
        </Button>
      </Section>

      <Text style={s.footerNote}>
        {t("Common.questionsPrefix")}{" "}
        <a href={`mailto:${STORE_EMAIL}`} style={s.link}>
          {STORE_EMAIL}
        </a>
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
