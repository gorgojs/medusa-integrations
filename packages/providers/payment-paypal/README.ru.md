<!-- TODO: логотип assets/paypal-medusa-logo.svg в стиле других плагинов -->

<h1 align="center">
Платежи PayPal для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-integrations/paypal">Документация</a>
  <br/>
  Плагин Medusa для приёма платежей через PayPal Checkout.
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

- **PayPal Checkout** – покупатель платит в окне PayPal своим аккаунтом PayPal или картой без аккаунта, если в настройках выбрана гостевая оплата.
- **Списание сразу или позже** – PayPal списывает деньги при оплате или блокирует сумму, а вы списываете её из заказа в Medusa Admin. Списать можно только всю заблокированную сумму.
- **Возвраты и отмена** – полные и частичные возвраты, несколько на один платёж. Отмена заказа снимает блокировку с несписанной суммы, а списанный платёж возвращает.
- **Заказ создаётся по вебхуку** – плагин проверяет каждый вебхук PayPal через API PayPal. Если покупатель закрыл вкладку после оплаты, вебхук всё равно оформит заказ, а списание, которое PayPal задержал на проверку, завершится после подтверждения PayPal.
- **Роуты для экспресс-оплаты** – роуты Store API отдают витрине публичные настройки для JS SDK PayPal, а также контакты и адрес покупателя из PayPal.
- **25 валют PayPal** – плагин учитывает число знаков после запятой у каждой валюты, поэтому заказ в JPY, HUF или TWD уходит в PayPal в целых единицах.
- **Несколько аккаунтов PayPal** – магазин может подключить несколько приложений PayPal, например по одному на регион.
- **Подробное логирование** – отладочные логи каждого вызова провайдера без ключей доступа.
- **Тесты** – юнит- и интеграционные тесты платёжного цикла и контрактный тест с песочницей PayPal.
- **[Модуль интеграций](https://gorgojs.ru/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" />** – вы настраиваете плагин в Medusa Admin без правки конфигурационных файлов и повторного развёртывания магазина. Модуль хранит секрет в зашифрованном виде, а кнопка **Проверить соединение** проверяет ключи и подписку вебхука.

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
