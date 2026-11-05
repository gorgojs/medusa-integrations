import {
  Button,
  Heading,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./layout";
import * as s from "./lib/styles";
import {
  type EmailLocale,
  DEFAULT_EMAIL_LOCALE,
  getEmailTranslator,
  STOREFRONT_URL,
  STORE_EMAIL,
  STORE_PHONE,
} from "./i18n";

/**
 * A shipping label as the Fulfillment Module stores it. Tracking lives here and
 * nowhere else: `create-fulfillment` never receives a tracking number, only
 * `create-shipment` does, through its `labels` input.
 */
export type FulfillmentLabel = {
  tracking_number?: string | null;
  tracking_url?: string | null;
};

export type OrderShipmentCreatedEmailProps = {
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
  labels?: FulfillmentLabel[];
  locale?: EmailLocale;
};

export function OrderShipmentCreatedEmail({
  order,
  labels = [],
  locale = DEFAULT_EMAIL_LOCALE,
}: OrderShipmentCreatedEmailProps) {
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
  const tracked = labels.filter((label) => label.tracking_number);

  return (
    <EmailLayout preview={t("Shipment.preview", { id })} locale={locale}>
      <Heading style={s.heading}>
        {customerName
          ? t("Shipment.headingWithName", { name: customerName })
          : t("Shipment.headingAnon")}
      </Heading>

      <Text
        style={s.paragraph}
        dangerouslySetInnerHTML={{
          __html: [
            html("Shipment.bodyOrder", { id }),
            city ? html("Shipment.deliveryCity", { city }) : "",
          ]
            .filter(Boolean)
            .join(" "),
        }}
      />

      <Section style={s.card}>
        <Text style={s.cardTitle}>{t("Shipment.trackingTitle")}</Text>

        {tracked.length > 0 ? (
          tracked.map((label, i) => (
            <Row key={i} style={s.trackRow}>
              <Column>
                <Text style={s.trackLabel}>{t("Shipment.trackLabel")}</Text>
                {label.tracking_url ? (
                  <a href={label.tracking_url} style={s.trackLink}>
                    {label.tracking_number}
                  </a>
                ) : (
                  <Text style={s.trackValue}>{label.tracking_number}</Text>
                )}
              </Column>
            </Row>
          ))
        ) : (
          <Text style={{ ...s.paragraph, margin: 0 }}>
            {t("Shipment.noTracking")}
          </Text>
        )}
      </Section>

      <Text style={s.paragraph}>{t("Shipment.deliveryTime")}</Text>

      <Section style={s.buttonSection}>
        <Button href={ordersUrl} style={s.button}>
          {t("Common.trackOrder")}
        </Button>
      </Section>

      <Text style={s.footerNote}>
        {t("Common.questionsPrefix")}{" "}
        <a href={`mailto:${STORE_EMAIL}`} style={s.link}>
          {STORE_EMAIL}
        </a>
        {STORE_PHONE ? (
          <>
            {" "}
            {t("Common.orCall")}{" "}
            <a href={`tel:${STORE_PHONE.replace(/\s/g, "")}`} style={s.link}>
              {STORE_PHONE}
            </a>
          </>
        ) : null}
      </Text>
    </EmailLayout>
  );
}

export default OrderShipmentCreatedEmail;
