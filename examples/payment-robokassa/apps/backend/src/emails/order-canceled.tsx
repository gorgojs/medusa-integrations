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

/** Sent on `order.canceled`. */
export type OrderCanceledEmailProps = {
  order: {
    id: string;
    display_id?: number | string;
    email?: string;
    shipping_address?: {
      first_name?: string;
      last_name?: string;
    };
  };
  locale?: EmailLocale;
};

export function OrderCanceledEmail({
  order,
  locale = DEFAULT_EMAIL_LOCALE,
}: OrderCanceledEmailProps) {
  const { t, html } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;
  const customerName = [
    order.shipping_address?.first_name,
    order.shipping_address?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <EmailLayout preview={t("OrderCanceled.preview", { id })} locale={locale}>
      <Heading style={s.heading}>
        {customerName
          ? t("OrderCanceled.headingWithName", { name: customerName })
          : t("OrderCanceled.headingAnon")}
      </Heading>

      <Text
        style={s.paragraph}
        dangerouslySetInnerHTML={{
          __html: html("OrderCanceled.bodyOrder", { id }),
        }}
      />

      <Text style={s.paragraph}>{t("OrderCanceled.refundNote")}</Text>

      <Section style={s.buttonSection}>
        <Button href={STOREFRONT_URL} style={s.button}>
          {t("Common.continueShopping")}
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

export default OrderCanceledEmail;
