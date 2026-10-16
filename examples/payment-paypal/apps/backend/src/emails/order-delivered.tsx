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

/** Sent on `delivery.created`, when the fulfillment is marked as delivered. */
export type OrderDeliveredEmailProps = {
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

export function OrderDeliveredEmail({
  order,
  locale = DEFAULT_EMAIL_LOCALE,
}: OrderDeliveredEmailProps) {
  const { t, html } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;
  const customerName = [
    order.shipping_address?.first_name,
    order.shipping_address?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const ordersUrl = `${STOREFRONT_URL}/account/orders`;

  return (
    <EmailLayout preview={t("Delivery.preview", { id })} locale={locale}>
      <Heading style={s.heading}>
        {customerName
          ? t("Delivery.headingWithName", { name: customerName })
          : t("Delivery.headingAnon")}
      </Heading>

      <Text
        style={s.paragraph}
        dangerouslySetInnerHTML={{ __html: html("Delivery.bodyOrder", { id }) }}
      />

      <Text style={s.paragraph}>{t("Delivery.somethingWrong")}</Text>

      <Section style={s.buttonSection}>
        <Button href={ordersUrl} style={s.button}>
          {t("Common.myOrders")}
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

export default OrderDeliveredEmail;
