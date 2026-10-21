<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-integrations/paypal">
    <img alt="Medusa-PayPal logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/paypal-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Платежи PayPal для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-integrations/paypal">Документация</a>
  <br/>
  Плагин Medusa для приёма платежей через PayPal.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/payment-paypal/README.md">Read README in English ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-paypal.json&logo=checkmarx" alt="Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-paypal">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-payment-paypal.svg?logo=npm&label=npm" alt="npm version" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/gorgojs_chat">
    <img src="https://img.shields.io/badge/Telegram-Support_Chat-0088cc?logo=telegram&style=social" alt="Telegram Support Chat" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/medusajs_chat">
    <img src="https://img.shields.io/badge/Telegram-Medusa.js_Dev_Community_Chat-0088cc?logo=telegram&style=social" alt="Medusa.js Chat on Telegram" />
  </a>
</p>

## Возможности плагина

- **Готов к продакшену:** Проверен в боевых магазинах и готов к использованию в реальных проектах.
- **Одно- и двухстадийная оплата:** Автосписание или авторизация с холдированием.
- **Возвраты и отмены:** Полный возврат и отмена заказов.
- **Вебхук-уведомления:** Статусы платежей в реальном времени с проверкой подписи.
- **Экспресс-оплата:** PayPal в ряду экспресс-оплаты [Medusa DTC Starter от Gorgo](https://docs.gorgojs.ru/tools/medusa-dtc-starter).
- **Подробное логирование:** Логи запросов и ответов для отладки и поддержки в режиме разработки.
- **Полное тестовое покрытие:** Юнит- и интеграционные тесты, покрывающие основные сценарии и граничные случаи.
- **Пример витрины магазина:** Готовый [пример витрины на Next.js](https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-paypal/apps/storefront) для использования как референс.
- **[Модуль интеграций](https://gorgojs.ru/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> :** Настройте плагин прямо в приложении Medusa Admin – без редактирования конфигурационных файлов и повторного развёртывания магазина.

## Что такое PayPal

В PayPal покупатель платит аккаунтом, к которому привязаны его карты и банковские счета, поэтому данные карты в магазин не попадают. PayPal принимает платежи в [25 валютах](https://developer.paypal.com/reference/currency-codes/).

## 💬 Поддержка и сообщество

Есть вопросы или идеи по плагину? Пишите в Telegram-чат поддержки [@gorgojs_chat](https://t.me/gorgojs_chat).

Общайтесь с другими разработчиками на Medusa в Telegram-чате [@medusajs_chat](https://t.me/medusajs_chat).

## Требования

- Medusa v2.17.2 или выше
- Node.js v20.19 или v22.12 и выше
- Бизнес-аккаунт PayPal и приложение в [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
- Модуль интеграций

## Установка

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-payment-paypal
# или
npm install @gorgo/medusa-integration @gorgo/medusa-payment-paypal
```

## Подключение

Зарегистрируйте плагин и оба провайдера в `medusa-config.ts`:

```ts
const PAYPAL_INTEGRATION_ID = "paypal-1"

module.exports = defineConfig({
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
        providers: [
          {
            resolve: "@gorgo/medusa-payment-paypal/providers/integration-paypal",
            id: PAYPAL_INTEGRATION_ID,
            options: {},
          },
        ],
      },
    },
    {
      resolve: "@gorgo/medusa-payment-paypal",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-payment-paypal/providers/payment-paypal",
            id: "paypal",
            options: { id: PAYPAL_INTEGRATION_ID },
          },
        ],
      },
    },
  ],
})
```

Задайте `INTEGRATION_ENCRYPTION_KEY` в `.env` бэкенда, перезапустите сервер и введите Client ID, секрет и ID вебхука в разделе **Настройки → Интеграции → PayPal**. Вебхук в PayPal направьте на `https://<ваш бэкенд>/hooks/payment/paypal_paypal` и подпишите на `PAYMENT.AUTHORIZATION.CREATED` и `PAYMENT.CAPTURE.COMPLETED`.

## Документация

Полное руководство по установке, настройке и использованию плагина доступно на [сайте документации Gorgo](https://docs.gorgojs.ru/medusa-integrations/paypal).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
