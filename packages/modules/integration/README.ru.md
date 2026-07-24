<h1 align="center">
Модуль интеграций для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-plugins/integration">Документация</a>
  <br/>
  Модуль Medusa, который позволяет плагинам описывать свои настройки, а администраторам магазина — конфигурировать их прямо в админке: без правок <code>medusa-config</code> и передеплоя, с шифрованием секретов.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/medusa-integration/README.md">Read README in English ↗</a>
</p>

<br>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Протестировано_с_Medusa-v2.17.2-green?logo=checkmarx" alt="Medusa" />
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

## Возможности

- **No-code конфигурация в админке.** Учётные данные и параметры плагинов задаются в разделе Настройки → Интеграции — без правок `medusa-config`/env и передеплоя.
- **Шифрование секретов на месте (at-rest).** Поля с пометкой `secret` шифруются (AES-256-GCM) и никогда не уходят в браузер.
- **Декларативный дескриптор** (`defineIntegration`) для авторов плагинов: опции, секции, валидация и проверка соединения — в одном месте.
- **Богатые типы опций и валидация:** `string` / `url` / `email` / `uuid` / `number` / `boolean` / `enum` / `json`, правила на уровне опции и меж-секционные, условная видимость, read-only-поля, i18n-подписи и иконка.
- **Несколько экземпляров** одного провайдера (например, несколько аккаунтов).
- **Проверка соединения** прямо из админки.
- **Типизированный резолв в рантайме:** потребитель получает провалидированный расшифрованный конфиг; неполные или выключенные конфигурации не резолвятся — черновик не «протекает» в рантайм.
- **Кастомные виджеты** провайдера в админке.
- **Анонимная телеметрия.**

## Что такое модуль интеграций?

Плагинам нужны настройки — ключи API, режимы, вебхуки. Обычно их держат в `medusa-config`/env: это требует доступа к коду и передеплоя при каждом изменении, а секреты лежат в открытом виде. Модуль переносит настройки в **админку и БД**: администратор магазина заполняет форму, секреты шифруются, а плагин-потребитель читает готовый конфиг в рантайме. Автор плагина при этом лишь **описывает** форму настроек — UI, хранение, шифрование и валидацию берёт на себя модуль.

## Подключённые плагины и провайдеры

| Провайдер | Категория | `resolve` |
|---|---|---|
| [T-Kassa](https://docs.gorgojs.ru/medusa-plugins/t-kassa) | `payment` | `@gorgo/medusa-payment-tkassa-v2/providers/integration-tkassa` |

Любой плагин может поставлять integration-провайдер — см. [документацию](https://docs.gorgojs.ru/medusa-plugins/integration).

## 💬  Поддержка и сообщество

Есть вопросы по модулю или идеи? Пишите в чат поддержки в Telegram — [@gorgojs_chat](https://t.me/gorgojs_chat)

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

Полное руководство по установке, настройке и использованию доступно на [сайте документации Gorgo](https://docs.gorgojs.ru/medusa-plugins/integration).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
