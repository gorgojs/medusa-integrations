<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-integrations/apiship">
    <img alt="Medusa-ApiShip logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/apiship-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Интеграция ApiShip для Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.ru/medusa-integrations/apiship">Документация</a>
  <br/>
  Плагин Medusa для интеграции с агрегатором служб доставки ApiShip, предоставляющий вашему магазину доступ к 40+ перевозчикам при минимальной настройке. Готов к продакшену.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/fulfillment-apiship/README.md">Read README in English ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-fulfillment-apiship.json&label=%D0%9F%D1%80%D0%BE%D1%82%D0%B5%D1%81%D1%82%D0%B8%D1%80%D0%BE%D0%B2%D0%B0%D0%BD%D0%BE%20%D1%81%20Medusa&logo=checkmarx" alt="Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-fulfillment-apiship.svg?logo=npm&label=npm" alt="npm version" />
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
  <a href="https://static.gorgojs.com/videos/fulfillment-apiship/demo/fulfillment-apiship-demo-ru.mp4">
    <img src="https://static.gorgojs.com/videos/fulfillment-apiship/demo/fulfillment-apiship-demo-ru-poster-play.ca605668.webp" alt="Смотреть демо-видео плагина ApiShip" width="100%" style="border-radius: 8px; max-width: 720px;">
  </a>
</p>

<p align="center">
  <a href="https://static.gorgojs.com/videos/fulfillment-apiship/demo/fulfillment-apiship-demo-ru.mp4">▶ Смотреть демо-видео</a>
</p>

## Возможности плагина

- **Готов к продакшену:** Проверен в боевых магазинах и готов к использованию в реальных проектах.
- **Подключение 40+ служб доставки:** Работа по прямым договорам с множеством перевозчиков через единую интеграцию.
- **Автоматический расчёт доставки:** Учёт габаритов, веса и тарифов служб доставки, а в корзину попадает цена тарифа, который выбрал покупатель.
- **Доставка в пункты выдачи:** Плагин возвращает пункты выдачи, которые обслуживает каждый тариф, а пример витрины показывает их на интерактивной карте.
- **Службы доставки для каждого склада:** Свяжите договор с каждым перевозчиком со складом, со своим пунктом приёма заказов и своим списком разрешённых тарифов.
- **Создание заказа в один клик:** Оформление отправления в ApiShip прямо из Medusa Admin без ручного ввода данных.
- **Этикетки отправлений:** Трек-номер, ссылка для отслеживания и PDF этикетки появляются в фулфилменте заказа в Medusa Admin.
- **Наложенный платёж:** Получение стоимости товаров при доставке, со ставкой НДС на доставку в заказе ApiShip.
- **Несколько аккаунтов ApiShip:** Регистрируйте несколько инстансов плагина, у каждого свой токен и свои настройки.
- **Полное тестовое покрытие:** Юнит- и интеграционные тесты, покрывающие основные сценарии и граничные случаи.
- **Пример витрины магазина:** Готовая [витрина на Next.js](https://github.com/gorgojs/medusa-integrations/tree/main/examples/fulfillment-apiship/apps/storefront), которую можно использовать как образец.
- **Тестовый режим:** Переключение на тестовую среду ApiShip, где расчёты и заказы не создают настоящих отправлений.
- **Подробное логирование:** Логи запросов и ответов на уровне логирования `debug` для отладки и поддержки.
- **[Модуль интеграций](https://gorgojs.ru/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> :** Настройте плагин прямо в приложении Medusa Admin, без правок конфигурационных файлов и повторного развёртывания магазина.

> **Модуль интеграций:** Этот плагин поддерживает модуль интеграций — он позволяет администратору магазина настраивать его прямо в приложении Medusa Admin, не редактируя конфигурационные файлы и не выполняя повторное развёртывание магазина. Конфиденциальные значения шифруются, а настройки проверяются перед применением.

## Что такое ApiShip

Российская платформа-агрегатор служб доставки <a href="https://apiship.ru/" target="_blank">ApiShip</a> подключает интернет-магазины к 40+ курьерским службам через единый API. Вместо отдельной интеграции с каждым перевозчиком ApiShip предоставляет унифицированный интерфейс для расчёта тарифов, создания заказов, отслеживания и формирования документов по всем подключённым провайдерам.

Среди популярных служб доставки, доступных через ApiShip: СДЭК, Яндекс Доставка, Почта России, Деловые Линии, ПЭК, Boxberry, СберЛогистика, DPD, и многие другие. Полный список можно посмотреть на <a href="https://apiship.ru/couriers" target="_blank">странице служб доставки</a> на сайте ApiShip.

## 💬  Поддержка и сообщество

Есть вопросы по плагину или идеи? Пишите в чат поддержки в Telegram [@gorgojs_chat](https://t.me/gorgojs_chat).

Общайтесь с другими разработчиками Medusa в Telegram в [@medusajs_chat](https://t.me/medusajs_chat).

## Требования

- Medusa v2.17.2 или новее
- Node.js 20.19 или новее либо 22.12 или новее
- Аккаунт ApiShip – [зарегистрируйтесь или войдите](https://a.apiship.ru)
- Модуль интеграций

## Установка

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-fulfillment-apiship
# или
npm install @gorgo/medusa-integration @gorgo/medusa-fulfillment-apiship
```

## Документация

Полное руководство по установке, настройке и использованию плагина доступно на [сайте документации Gorgo](https://docs.gorgojs.ru/medusa-integrations/apiship).

## Лицензия

Распространяется на условиях [лицензии MIT](LICENSE).
