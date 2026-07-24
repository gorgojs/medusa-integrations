<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-plugins/yookassa">
    <img alt="Medusa-YooKassa logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/yookassa-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Платежи ЮKassa для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-plugins/yookassa">Документация</a>
  <br/>
  Плагин Medusa для приёма платежей через ЮKassa. Готов к продакшену.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/medusa-payment-yookassa/README.md">Read README in English ↗</a>
</p>

<br>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-yookassa.json&label=%D0%9F%D1%80%D0%BE%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%20%D1%81%20Medusa&logo=checkmarx" alt="Протестировано с последней версией Medusa" />
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
- **Полная интеграция с ЮKassa:** Подключение к платёжной системе ЮKassa для надёжной обработки платежей.
- **Формирование чеков:** Онлайн-чеки в соответствии с 54-ФЗ (ФФД 1.05 и 1.2).
- **Одно- и двухстадийная оплата:** Автосписание или авторизация с холдированием.
- **Возвраты и отмены:** Полный возврат и отмена заказов.
- **Вебхук-уведомления:** Статусы платежей в реальном времени с проверкой подписи.
- **Подробное логирование:** Логи запросов и ответов для отладки и поддержки в режиме разработки.
- **Полное тестовое покрытие:** Юнит- и интеграционные тесты, покрывающие основные сценарии и граничные случаи.
- **Пример витрины магазина:** Готовый [пример витрины на Next.js](https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-yookassa/medusa-storefront) для использования как референс.
- **`Модуль интеграций`:** Настройте плагин прямо в приложении Medusa Admin — без редактирования конфигурационных файлов и повторного развёртывания магазина.

> **Модуль интеграций:** Этот плагин поддерживает модуль интеграций — он позволяет администратору магазина настраивать плагин прямо в приложении Medusa Admin, не редактируя конфигурационные файлы и не выполняя повторное развёртывание магазина. Конфиденциальные значения шифруются, а настройки проверяются перед применением.

## Что такое ЮKassa

ЮKassa - сервис интернет-эквайринга от Яндекса. Позволяет интернет-магазинам принимать оплату картами, через СБП, SberPay, Mir Pay, ЮMoney и другими способами. Подробнее на <a href="https://yookassa.ru/" target="_blank">сайте ЮKassa</a>.

## 💬  Поддержка и сообщество

Есть вопросы по плагину или идеи? Пишите в чат поддержки в Telegram — [@gorgojs_chat](https://t.me/gorgojs_chat)

Общайтесь с другими разработчиками Medusa в Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Требования

- Medusa v2.17.2 или выше  
- Node.js v20 или выше  
- Аккаунт YooKassa – [зарегистрируйтесь или войдите](https://yookassa.ru/joinups/?source=ks)
- Модуль интеграций v0.1.0 или новее

## Установка

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-payment-yookassa
# или
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-payment-yookassa
```

## Документация

Полное руководство по установке, настройке и использованию плагина доступно на [сайте документации Gorgo](https://docs.gorgojs.ru/medusa-plugins/yookassa).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
