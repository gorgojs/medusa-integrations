<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-integrations/stripe">
    <img alt="Medusa-Stripe logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/stripe-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Платежи Stripe для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-integrations/stripe">Документация</a>
  <br/>
  Плагин Medusa для приёма платежей через Stripe.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/payment-stripe/README.md">Read README in English ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-stripe.json&logo=checkmarx" alt="Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-stripe">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-payment-stripe.svg?logo=npm&label=npm" alt="npm version" />
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
- **Возвраты и отмены:** Возврат средств и отмена заказов.
- **Вебхук-уведомления:** Статусы платежей в реальном времени с проверкой подписи.
- **Экспресс-оплата:** Apple Pay, Google Pay и Link в ряду экспресс-оплаты [Medusa DTC Starter от Gorgo](https://docs.gorgojs.ru/tools/medusa-dtc-starter).
- **Подробное логирование:** Логи запросов и ответов для отладки и поддержки в режиме разработки.
- **Полное тестовое покрытие:** Юнит- и интеграционные тесты, покрывающие основные сценарии и граничные случаи.
- **Пример витрины магазина:** Готовый [пример витрины на Next.js](https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-stripe/apps/storefront) для использования как референс.
- **[Модуль интеграций](https://gorgojs.ru/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> :** Настройте плагин прямо в приложении Medusa Admin – без редактирования конфигурационных файлов и повторного развёртывания магазина.

## Что такое Stripe

В Stripe покупатель платит в собственной платёжной форме Stripe, поэтому данные карты в магазин не попадают. Stripe принимает платежи в [более чем 130 валютах](https://docs.stripe.com/currencies).

## 💬 Поддержка и сообщество

Есть вопросы или идеи по плагину? Пишите в Telegram-чат поддержки [@gorgojs_chat](https://t.me/gorgojs_chat).

Общайтесь с другими разработчиками на Medusa в Telegram-чате [@medusajs_chat](https://t.me/medusajs_chat).

## Требования

- Medusa v2.17.2 или выше
- Node.js v20.19 или v22.12 и выше
- Аккаунт Stripe и его API-ключи из раздела **Developers → API keys** в [Stripe Dashboard](https://dashboard.stripe.com/)
- Модуль интеграций

## Установка

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-payment-stripe
# или
npm install @gorgo/medusa-integration @gorgo/medusa-payment-stripe
```

## Подключение

Зарегистрируйте плагин и оба провайдера в `medusa-config.ts`:

```ts
const STRIPE_INTEGRATION_ID = "stripe-1"

module.exports = defineConfig({
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
        providers: [
          {
            resolve: "@gorgo/medusa-payment-stripe/providers/integration-stripe",
            id: STRIPE_INTEGRATION_ID,
            options: {},
          },
        ],
      },
    },
    {
      resolve: "@gorgo/medusa-payment-stripe",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-payment-stripe/providers/payment-stripe",
            id: "stripe",
            options: { id: STRIPE_INTEGRATION_ID },
          },
        ],
      },
    },
  ],
})
```

Задайте `INTEGRATION_ENCRYPTION_KEY` в `.env` бэкенда, перезапустите сервер и введите секретный ключ, публикуемый ключ и секрет подписи вебхука в разделе **Настройки → Интеграции → Stripe**. На той же странице задаются способ списания, конфигурация способов оплаты, описание платежа, текст в выписке по карте и отправка чека на email. Эндпоинт вебхука в Stripe направьте на `https://<ваш бэкенд>/hooks/payment/stripe_stripe` и подпишите на `payment_intent.succeeded` и `payment_intent.amount_capturable_updated`.

## Переход со встроенного провайдера Medusa

Плагин заменяет `@medusajs/payment-stripe` из Medusa без миграции данных. ID провайдера остаётся `pp_stripe_stripe`, а URL вебхука остаётся `/hooks/payment/stripe_stripe`. Платежи, созданные встроенным провайдером, по-прежнему списываются и возвращаются, а эндпоинт вебхука в Stripe Dashboard продолжает работать.

Чтобы перейти, выполните следующее:

- Зарегистрируйте плагин и оба провайдера, как показано выше, вместо встроенного провайдера и оставьте у платёжного провайдера `id: "stripe"`.
- Перенесите опции `apiKey`, `webhookSecret` и `capture` встроенного провайдера в **Настройки → Интеграции → Stripe**. Встроенный провайдер только блокирует сумму, если не задать `capture: true`, а плагин по умолчанию списывает сразу.
- Не оставляйте оба пакета зарегистрированными с `id: "stripe"`, иначе оба займут `pp_stripe_stripe`.

## Данные об использовании

Плагин отправляет анонимные данные об использовании при запуске. Чтобы отключить отправку, задайте переменную окружения `GORGO_DISABLE_TELEMETRY=true`. Подробности есть на странице [Данные об использовании](https://docs.gorgojs.ru/tools/usage-data).

## Документация

Полное руководство по установке, настройке и использованию плагина доступно на [сайте документации Gorgo](https://docs.gorgojs.ru/medusa-integrations/stripe).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
