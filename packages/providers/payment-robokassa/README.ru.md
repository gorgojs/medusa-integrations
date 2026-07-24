<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-plugins/robokassa">
    <img alt="Medusa-Robokassa logo" src="https://raw.githubusercontent.com/gorgojs/medusa-plugins/refs/heads/main/assets/robokassa-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Платежи Robokassa для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-plugins/robokassa">Документация</a>
  <br/>
  Плагин Medusa для приёма платежей через Robokassa. Готов к продакшену.
  <br/>
  <a href="https://github.com/gorgojs/medusa-plugins/blob/HEAD/packages/medusa-payment-robokassa/README.md">Read README in English →</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-plugins/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-plugins/main/.badges/medusa-payment-robokassa.json&label=%D0%9F%D1%80%D0%BE%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%20%D1%81%20Medusa&logo=checkmarx" alt="Medusa" />
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

## Возможности плагина

- **Готов к продакшену:** Проверен в боевых магазинах и готов к использованию в реальных проектах.
- **Полная интеграция с Robokassa:** Подключение к платёжной системе Robokassa для надёжной обработки платежей.
- **Формирование чеков:** Онлайн-чеки в соответствии с 54-ФЗ.
- **Одно- и двухстадийная оплата:** Автосписание или авторизация с холдированием.
- **Возвраты и отмены:** Возврат средств и отмена заказов.
- **Вебхук-уведомления:** Статусы платежей в реальном времени с проверкой подписи.
- **Тестовый режим:** Имитация оплаты без реальных списаний.
- **Подробное логирование:** Логи запросов и ответов для отладки и поддержки в режиме разработки.
- **Полное тестовое покрытие:** Юнит- и интеграционные тесты, покрывающие основные сценарии и граничные случаи.
- **Пример витрины магазина:** Готовый [пример витрины на Next.js](https://github.com/gorgojs/medusa-plugins/tree/main/examples/payment-robokassa/medusa-storefront) для использования как референс.
- **`Модуль интеграций`:** Настройте плагин прямо в приложении Medusa Admin — без редактирования конфигурационных файлов и повторного развёртывания магазина.

> **Модуль интеграций:** Этот плагин поддерживает модуль интеграций — он позволяет администратору магазина настраивать плагин прямо в приложении Medusa Admin, не редактируя конфигурационные файлы и не выполняя повторное развёртывание магазина. Конфиденциальные значения шифруются, а настройки проверяются перед применением.

## Что такое Robokassa

<a href="https://robokassa.com" target="_blank">Robokassa</a> — российский платёжный агрегатор, поддерживающий банковские карты, электронные кошельки, мобильные платежи, СБП и другие способы оплаты. Широко используется малым и средним бизнесом в России благодаря простой интеграции и широкому охвату платёжных методов.

## 💬  Поддержка и сообщество

Есть вопросы по плагину или идеи? Пишите в чат поддержки в Telegram — [@gorgojs_chat](https://t.me/gorgojs_chat)

Общайтесь с другими разработчиками Medusa в Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Требования

- Medusa v2.17.2 или новее  
- Node.js v20 или новее  
- Аккаунт Robokassa — [зарегистрируйтесь или войдите](https://login.robokassa.ru/reg?promoCode=gorgo)
- Модуль интеграций v0.1.0 или новее

## Установка

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-payment-robokassa
# или
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-payment-robokassa
```

## Документация

Полное руководство по установке, настройке и использованию плагина доступно на [сайте документации Gorgo](https://docs.gorgojs.ru/medusa-plugins/robokassa).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
