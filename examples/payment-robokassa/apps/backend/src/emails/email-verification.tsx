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

export type EmailVerificationEmailProps = {
  email: string;
  verifyUrl: string;
  locale?: EmailLocale;
};

export function EmailVerificationEmail({
  email,
  verifyUrl,
  locale = DEFAULT_EMAIL_LOCALE,
}: EmailVerificationEmailProps) {
  const { t, html } = getEmailTranslator(locale);

  return (
    <EmailLayout preview={t("EmailVerification.preview")} locale={locale}>
      <Heading style={s.heading}>{t("EmailVerification.heading")}</Heading>

      <Text
        style={s.paragraph}
        dangerouslySetInnerHTML={{
          __html: html("EmailVerification.body", { email }),
        }}
      />

      <Section style={s.buttonSection}>
        <Button href={verifyUrl} style={s.button}>
          {t("EmailVerification.button")}
        </Button>
      </Section>

      <Text
        style={s.hint}
        dangerouslySetInnerHTML={{ __html: html("EmailVerification.hint") }}
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

export default EmailVerificationEmail;
