<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-plugins/1c-enterprise">
    <img alt="Medusa-1C logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/1c-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
  Интеграция 1С:Предприятие с Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-plugins/1c-enterprise">Документация</a>
  <br/>
  Синхронизация товаров и заказов между Medusa и 1С:Предприятие.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/medusa-1c/README.md">Read README in English ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-1c.json&label=%D0%9F%D1%80%D0%BE%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%20%D1%81%20Medusa&logo=checkmarx" alt="Medusa" />
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

## Статус

> 🚧 Интеграция в настоящее время находится в разработке, см. [Roadmap](#roadmap).

## 💬  Поддержка и сообщество

Есть вопросы по плагину или идеи? Пишите в чат поддержки в Telegram — [@gorgojs_chat](https://t.me/gorgojs_chat)

Общайтесь с другими разработчиками Medusa в Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Roadmap

- [x] Импорт товаров из 1C в Medusa (`import.xml`)
- [x] Импорт предложений из 1C в Medusa (`offers.xml`)
- [ ] Синхронизация остатков и цен между 1C и Medusa
- [ ] Импорт заказов из 1C в Medusa (`orders.xml`)
- [ ] Экспорт заказов из Medusa в 1C
- [ ] Расширение админки для статуса синхронизации и управления
- [ ] Расширение админки для журналирования и аудита
- [ ] Подробная документация

> **Модуль интеграций:** Этот плагин поддерживает модуль интеграций — он позволяет администратору магазина настраивать плагин прямо в приложении Medusa Admin, не редактируя конфигурационные файлы и не выполняя повторное развёртывание магазина. Конфиденциальные значения шифруются, а настройки проверяются перед применением.

## Требования

- Medusa v2.17.2 или новее
- Node.js v20 или новее
- Модуль интеграций v0.1.0 или новее

## Установка

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-1c
# или
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-1c
```

## Документация

Полное руководство по установке, настройке и использованию плагина доступно на [сайте документации Gorgo](https://docs.gorgojs.com/medusa-plugins/1c-enterprise).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
