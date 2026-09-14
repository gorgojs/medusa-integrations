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
import { type NumericValue, toNumber } from "./lib/big-number";
import {
  type EmailLocale,
  DEFAULT_EMAIL_LOCALE,
  getEmailTranslator,
  STOREFRONT_URL,
  STORE_EMAIL,
} from "./i18n";

export type OrderPlacedEmailProps = {
  order: {
    id: string;
    display_id?: number | string;
    email?: string;
    items?: Array<{
      title?: string;
      quantity?: NumericValue;
      unit_price?: NumericValue;
    }>;
    currency_code?: string;
    total?: NumericValue;
    shipping_total?: NumericValue;
    shipping_address?: {
      first_name?: string;
      last_name?: string;
      city?: string;
    };
  };
  locale?: EmailLocale;
};

export function OrderPlacedEmail({
  order,
  locale = DEFAULT_EMAIL_LOCALE,
}: OrderPlacedEmailProps) {
  const { t, html, money } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;
  const customerName = [
    order.shipping_address?.first_name,
    order.shipping_address?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  /**
   * The only place a customer ever sees the order's id. Everything else shows
   * the display number, and the transfer flow that links a guest order to an
   * account needs the id. Medusa serves an order to anyone holding its id, so
   * the id is the secret, and this email already goes to the order's own
   * address.
   */
  const orderUrl = `${STOREFRONT_URL}/order/${order.id}/confirmed`;
  const ordersUrl = `${STOREFRONT_URL}/account/orders`;
  const city = order.shipping_address?.city;
  const formatAmount = (amount: NumericValue) =>
    money(toNumber(amount), order.currency_code);

  return (
    <EmailLayout preview={t("OrderPlaced.preview", { id })} locale={locale}>
      <Heading style={s.heading}>
        {customerName
          ? t("OrderPlaced.headingWithName", { name: customerName })
          : t("OrderPlaced.headingAnon")}
      </Heading>

      <Text
        style={s.paragraph}
        dangerouslySetInnerHTML={{
          __html: [
            html("OrderPlaced.bodyOrder", { id }),
            city ? html("OrderPlaced.deliveryCity", { city }) : "",
          ]
            .filter(Boolean)
            .join(" "),
        }}
      />

      {order.items && order.items.length > 0 && (
        <Section style={s.card}>
          <Text style={s.cardTitle}>{t("Common.orderSummary")}</Text>
          {order.items.map((item, i) => (
            <Row key={i} style={s.itemRow}>
              <Column style={s.itemName}>
                {item.title || t("Common.item")} × {toNumber(item.quantity, 1)}
              </Column>
              <Column style={s.itemPrice}>
                {item.unit_price != null
                  ? formatAmount(
                      toNumber(item.unit_price) * toNumber(item.quantity, 1),
                    )
                  : "-"}
              </Column>
            </Row>
          ))}
          {order.shipping_total != null && (
            <Row style={s.itemRow}>
              <Column style={s.itemName}>{t("Common.shipping")}</Column>
              <Column style={s.itemPrice}>
                {formatAmount(order.shipping_total)}
              </Column>
            </Row>
          )}
          {order.total != null && (
            <Row style={s.totalRow}>
              <Column style={s.totalLabel}>{t("Common.total")}</Column>
              <Column style={s.totalAmount}>{formatAmount(order.total)}</Column>
            </Row>
          )}
        </Section>
      )}

      <Text style={s.paragraph}>{t("OrderPlaced.watchStatus")}</Text>

      <Section style={s.buttonSection}>
        <Button href={orderUrl} style={s.button}>
          {t("Common.viewOrder")}
        </Button>
      </Section>

      <Text style={s.hint}>
        {t("Common.haveAccount")}{" "}
        <a href={ordersUrl} style={s.link}>
          {t("Common.myOrders")}
        </a>
      </Text>

      <Text style={s.footerNote}>
        {t("Common.questionsPrefix")}{" "}
        <a href={`mailto:${STORE_EMAIL}`} style={s.link}>
          {STORE_EMAIL}
        </a>
      </Text>
    </EmailLayout>
  );
}

export default OrderPlacedEmail;
