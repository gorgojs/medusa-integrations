import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./layout";
import * as s from "./lib/styles";
import {
  type EmailLocale,
  DEFAULT_EMAIL_LOCALE,
  getEmailTranslator,
  STORE_EMAIL,
} from "./i18n";

export type PasswordResetEmailProps = {
  email: string;
  token: string;
  resetUrl: string;
  locale?: EmailLocale;
};

export function PasswordResetEmail({
  email,
  resetUrl,
  locale = DEFAULT_EMAIL_LOCALE,
}: PasswordResetEmailProps) {
  const { t, html } = getEmailTranslator(locale);

  return (
    <EmailLayout preview={t("PasswordReset.preview")} locale={locale}>
      <Heading style={s.heading}>{t("PasswordReset.heading")}</Heading>

      <Text
        style={s.paragraph}
        dangerouslySetInnerHTML={{
          __html: html("PasswordReset.body", { email }),
        }}
      />

      <Section style={s.buttonSection}>
        <Button href={resetUrl} style={s.button}>
          {t("PasswordReset.button")}
        </Button>
      </Section>

      <Text
        style={s.hint}
        dangerouslySetInnerHTML={{ __html: html("PasswordReset.hint") }}
      />

      <Text style={s.footerNote}>
        {t("Common.questionsPrefix")}{" "}
        <a href={`mailto:${STORE_EMAIL}`} style={s.link}>
          {STORE_EMAIL}
        </a>
      </Text>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
