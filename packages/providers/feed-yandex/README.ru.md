<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-plugins/yandex-yml-feed">
    <img alt="Medusa-Yandex Market logo" src="https://raw.githubusercontent.com/gorgojs/medusa-plugins/refs/heads/main/assets/yandex-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Генератор YML-фида в формате Яндекс Маркет для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-plugins/yandex-yml-feed">Документация</a>
  <br/>
  Плагин Medusa, который генерирует фид товаров в формате <a href="https://yandex.com/support/direct/feeds/requirements-yml.html">YML (Yandex Market Language)</a>.
  <br/>
  <a href="https://github.com/gorgojs/medusa-plugins/blob/HEAD/packages/medusa-feed-yandex/README.md">Read README in English ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.14.0-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-plugins/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-plugins/main/.badges/medusa-feed-yandex.json&label=%D0%9F%D1%80%D0%BE%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%20%D1%81%20Medusa&logo=checkmarx" alt="Medusa" />
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

- **Экспорт YML-фида:** Генерация фида товаров в формате Yandex Market YML.
- **Доступ к URL фидов:** Удобное получение ссылок для интеграции с Яндекс Маркетом.
- **Интерфейс в админке:** Управление фидами прямо из Medusa Admin.
- **Генерация по расписанию:** Автоматический экспорт фидов с настраиваемым интервалом.
- **Фильтрация по категориям:** Выбор конкретных категорий товаров для экспорта.
- **Ручная генерация:** Запуск генерации фида по требованию.
- **Интеграция с File Module:** Использует Medusa File Module с поддержкой встроенных провайдеров.

## Что такое YML

<a href="https://yandex.com/support/direct/feeds/requirements-yml.html" target="_blank">YML (Yandex Market Language)</a> — формат фида товаров на основе XML, используемый Яндекс Маркетом и Яндекс Директом. Это стандартный способ размещения товаров на Яндекс Маркете — одном из крупнейших маркетплейсов в России.

## 💬  Поддержка и сообщество

Есть вопросы по плагину или идеи? Пишите в чат поддержки в Telegram — [@gorgojs_chat](https://t.me/gorgojs_chat)

Общайтесь с другими разработчиками Medusa в Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Требования

- Medusa сервер v2.14.0 или новее
- Node.js v20 или новее

## Установка

```bash
yarn add @gorgo/medusa-feed-yandex
# или
npm install @gorgo/medusa-feed-yandex
```

## Документация

Полное руководство по установке, настройке и использованию плагина доступно на [сайте документации Gorgo](https://docs.gorgojs.com/medusa-plugins/yandex-yml-feed).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
