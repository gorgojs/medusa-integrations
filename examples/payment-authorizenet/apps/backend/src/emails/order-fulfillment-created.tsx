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

/**
 * Sent on `order.fulfillment_created`, which fires when the warehouse packs the
 * order. The parcel has not been handed to a carrier yet and no tracking number
 * exists at this point, so this email deliberately promises one later rather
 * than showing an empty tracking block. The tracking arrives with
 * `order-shipment-created`.
 */
export type OrderFulfillmentCreatedEmailProps = {
  order: {
    id: string;
    display_id?: number | string;
    email?: string;
    shipping_address?: {
      first_name?: string;
      last_name?: string;
      city?: string;
    };
  };
  locale?: EmailLocale;
};

export function OrderFulfillmentCreatedEmail({
  order,
  locale = DEFAULT_EMAIL_LOCALE,
}: OrderFulfillmentCreatedEmailProps) {
  const { t, html } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;
  const customerName = [
    order.shipping_address?.first_name,
    order.shipping_address?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const ordersUrl = `${STOREFRONT_URL}/account/orders`;
  const city = order.shipping_address?.city;

  return (
    <EmailLayout preview={t("Fulfillment.preview", { id })} locale={locale}>
      <Heading style={s.heading}>
        {customerName
          ? t("Fulfillment.headingWithName", { name: customerName })
          : t("Fulfillment.headingAnon")}
      </Heading>

      <Text
        style={s.paragraph}
        dangerouslySetInnerHTML={{
          __html: [
            html("Fulfillment.bodyOrder", { id }),
            city ? html("Fulfillment.deliveryCity", { city }) : "",
          ]
            .filter(Boolean)
            .join(" "),
        }}
      />

      <Text style={s.paragraph}>{t("Fulfillment.nextStep")}</Text>

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

export default OrderFulfillmentCreatedEmail;
