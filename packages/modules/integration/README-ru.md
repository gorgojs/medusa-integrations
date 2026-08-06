<p align="center">
  <a href="https://docs.gorgojs.ru/integrations/integration">
    <img alt="Integration Module logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/integration-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Модуль интеграций для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/integrations/integration">Документация</a>
  <br/>
  Модуль Medusa, который позволяет любому плагину описывать свои параметры, а администраторам магазина управлять ими в Admin – без правок <code>medusa-config</code> и без передеплоя.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/modules/integration/README.md">Read README in English ↗</a>
</p>

<br>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-integration.json&label=%D0%9F%D1%80%D0%BE%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%20%D1%81%20Medusa&logo=checkmarx" alt="Medusa" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/gorgojs_chat">
    <img src="https://img.shields.io/badge/Telegram-Чат_поддержки-0088cc?logo=telegram&style=social" alt="Чат поддержки в Telegram" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/medusajs_chat">
    <img src="https://img.shields.io/badge/Telegram-Чат_dev--сообщества_Medusa.js-0088cc?logo=telegram&style=social" alt="Чат сообщества разработчиков Medusa.js в Telegram" />
  </a>
</p>

<p align="center">
  <a href="https://static.gorgojs.com/videos/integration-module/integration-module.mp4">
    <img src="https://static.gorgojs.com/videos/integration-module/integration-module-preview-1776169330.webp" alt="Смотреть демо Модуля интеграций" width="100%" style="border-radius: 8px; max-width: 720px;">
  </a>
</p>

## Что такое Модуль интеграций?

Модуль интеграций позволяет любому плагину описывать свои опции, а администраторам магазина настраивать их как **интеграции** прямо в Admin – без правок `medusa-config` и передеплоя. UI, хранение, шифрование и валидацию модуль берёт на себя.

Модуль интеграций пригодится любому разработчику Medusa, который создаёт плагины, провайдеры или кастомные модули с настраиваемыми параметрами, такими как ключи API, учётные данные, режимы или вебхуки, но не хочет вручную собирать страницы настроек, слой хранения и валидацию для каждого из них.

## Возможности

- **Управление настройками в Admin:** Настройки задаются в разделе **Настройки → Интеграции**, без правок `medusa-config`/env и без передеплоя.
- **Любой плагин, провайдер или модуль:** Подходит для платежей, доставки, ERP, уведомлений, контента и других расширений.
- **Декларативный дескриптор (`defineIntegration`):** Единое описание параметров, секций настроек, валидации и проверки соединения.
- **Гибкая типизация и валидация:** Типизированные поля (`string`, `url`, `email`, `uuid`, `number`, `boolean`, `enum`, `json`) с правилами на уровне параметров и между секциями, условной видимостью и read-only-полями. В рантайме плагин получает типизированный расшифрованный объект: неполные или отключённые настройки не резолвятся, поэтому незаполненный черновик не будет возвращён.
- **Шифрование секретов:** Поля с пометкой `secret` шифруются (AES-256-GCM) и никогда не уходят в браузер.
- **Несколько экземпляров:** Один и тот же провайдер настраивается несколько раз. Например, для нескольких аккаунтов в одном стороннем сервисе.
- **Проверка соединения:** Проверка учётных данных в стороннем сервисе прямо из Admin.
- **Расширяемый UI:** Секции можно менять местами ([LayoutComposer](https://docs.medusajs.com/resources/admin-components/components/layout-composer)). Если готовых секций недостаточно, можно реализовать любой UI для своих параметров с помощью кастомных виджетов.
- **Каталог интеграций:** Доступные интеграции отображаются в Admin.

## Доступные интеграции

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/apiship.svg" width="50" hspace="5" align="left" alt="ApiShip logo"/>
  </a>
  <b>ApiShip</b><br/>
  Доставка · <a href="https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship">@gorgo/medusa-fulfillment-apiship</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/tkassa.png" width="50" hspace="5" align="left" alt="T-Kassa logo"/>
  </a>
  <b>Т-Касса от Т-Банка</b><br/>
  Платежи · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa">@gorgo/medusa-payment-tkassa</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/yookassa.svg" width="50" hspace="5" align="left" alt="YooKassa logo"/>
  </a>
  <b>ЮKassa</b><br/>
  Платежи · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa">@gorgo/medusa-payment-yookassa</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/robokassa.svg" width="50" hspace="5" align="left" alt="Robokassa logo"/>
  </a>
  <b>Robokassa</b><br/>
  Платежи · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa">@gorgo/medusa-payment-robokassa</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/1c.svg" width="50" hspace="5" align="left" alt="1C logo"/>
  </a>
  <b>1С:Предприятие</b><br/>
  ERP · <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">@gorgo/medusa-1c</a>
</p>

Любой плагин может использовать Модуль интеграций, см. [документацию](https://docs.gorgojs.ru/medusa-modules/integration).

## 💬  Поддержка и сообщество

Есть вопросы или идеи? Пишите в чат поддержки в Telegram — [@gorgojs_chat](https://t.me/gorgojs_chat)

Общайтесь с другими разработчиками Medusa в Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Требования

- Medusa v2.17.2 или выше
- Node.js v20 или выше

## Установка

```bash
yarn add @gorgo/medusa-integration
# или
npm install @gorgo/medusa-integration
```

## Документация

Полное руководство по установке, настройке и использованию доступно на [сайте документации Gorgo](https://docs.gorgojs.ru/medusa-modules/integration).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
