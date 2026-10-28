# Security Policy

[Русская версия ниже](#политика-безопасности)

## Supported Versions

Security fixes ship in the latest version of each package published from this repository. Older versions don't get backports, so update to the latest version to receive a fix.

## Reporting a Vulnerability

Don't report a vulnerability in a public issue, a discussion or a Telegram chat. Report it privately with the **Report a vulnerability** button on the repository's [Security](https://github.com/gorgojs/medusa-integrations/security) tab.

A useful report includes:

- the package name and version, and your Medusa version;
- steps to reproduce the problem or a proof of concept;
- what an attacker could do with it.

## What Happens Next

- We usually acknowledge a report within one business day, Monday to Friday.
- We reproduce the problem and keep you posted in the private advisory.
- The fix ships as a patch release ahead of other work.
- After the release we publish a GitHub security advisory listing the affected versions and the version with the fix. We credit you as the reporter unless you'd rather stay anonymous.

## Scope

This policy covers the packages published from this repository and the example projects in [`examples/`](examples).

Report a vulnerability in Medusa itself to the Medusa team, as their [security policy](https://github.com/medusajs/medusa/blob/develop/SECURITY.md) describes. Report a vulnerability in a payment or shipping provider's own service to that provider.

The [Maintenance](https://docs.gorgojs.com/resources/maintenance) page covers how we maintain the plugins, the Integration Module and the DTC Starter in general.

---

# Политика безопасности

## Поддерживаемые версии

Исправления безопасности выходят в последней версии каждого пакета из этого репозитория. В старые версии они не переносятся, поэтому, чтобы получить исправление, обновите пакет до последней версии.

## Как сообщить об уязвимости

Не сообщайте об уязвимости в открытом issue, обсуждении или чате в Telegram. Сообщите о ней конфиденциально, для этого на вкладке [Security](https://github.com/gorgojs/medusa-integrations/security) репозитория нажмите **Report a vulnerability**.

В сообщении пригодятся:

- название и версия пакета, версия Medusa;
- шаги для воспроизведения или пример эксплуатации;
- что может сделать злоумышленник.

## Что происходит дальше

- Обычно мы подтверждаем получение в течение рабочего дня, с понедельника по пятницу.
- Мы воспроизводим проблему и сообщаем о ходе работы в закрытом бюллетене.
- Исправление выходит патч-релизом вне очереди.
- После релиза мы публикуем на GitHub бюллетень безопасности с затронутыми версиями и версией, в которой уязвимость исправлена. В нём мы указываем вас как автора находки, если вы не против.

## Что входит в эту политику

Политика распространяется на пакеты, которые публикуются из этого репозитория, и на проекты-примеры в [`examples/`](examples).

Об уязвимости в самой Medusa сообщайте команде Medusa, как описано в её [политике безопасности](https://github.com/medusajs/medusa/blob/develop/SECURITY.md). Об уязвимости в сервисе провайдера платежей или доставки сообщайте самому провайдеру.

Как мы сопровождаем плагины, Модуль интеграций и DTC-стартер в целом, описано на странице [Сопровождение](https://docs.gorgojs.ru/resources/maintenance).
