# Переход на прямые сервисы Yandex Cloud

## Фактический статус на 29.08.2026

- Платёжный аккаунт активирован, отдельный каталог `slovesto-production` создан: `b1g2du8qrd8hepvk9ts9`.
- Сервисный аккаунт `slovesto-production-app` создан с минимальными ролями `ai.languageModels.user` и `postbox.sender`.
- API-ключ AI ограничен scope `yc.ai.languageModels.execute`; статический ключ Postbox выпущен. Секреты находятся только в локальном `.env.local` и не добавляются в Git.
- Прямой запрос к `gpt://b1g2du8qrd8hepvk9ts9/yandexgpt/latest` прошёл успешно. Включён обязательный композиционный план `YANDEX_COMPOSER_PLANNING=1`.
- В Postbox создан и подтверждён домен `mail.slovesto.ru`, разрешён только отправитель `hello@mail.slovesto.ru`.
- У DNS-провайдера SpaceWeb опубликованы две записи CNAME; проверка Postbox завершилась со статусом `Success`:
  - `egtspkai65an260cfpqf-1._domainkey.mail.slovesto.ru` → `egtspkai65an260cfpqf-1.dkim.pstbx.ru`;
  - `egtspkai65an260cfpqf-2._domainkey.mail.slovesto.ru` → `egtspkai65an260cfpqf-2.dkim.pstbx.ru`.
- Живой тест отправил через Postbox подтверждение напоминания и само напоминание. В журнале Yandex Cloud оба письма имеют статус `Delivery`.

## Что уже подготовлено разработчиком

- Все пользовательские AI-сценарии используют общий OpenAI-совместимый клиент: создание поздравления на странице join, создание и редактирование поздравления администратором, сокращение и корректура, лучшие цитаты и качества получателя.
- При `AI_*_PROVIDER=yandex` запросы идут прямо на `https://ai.api.cloud.yandex.net/v1/chat/completions`.
- Все письма (ссылка организатору, напоминания, обращения в поддержку и критические уведомления) идут через единый транспорт. Для production выбран Yandex Cloud Postbox.
- Политика `PRODUCTION_PROVIDER_POLICY=russian-only` запрещает RouterAI, OpenAI, GigaChat и Resend в production.
- `npm run providers:check` проверяет конфигурацию без показа секретов; `npm run ai:check` выполняет отдельную живую проверку Yandex AI после установки ключа.

## Что должна сделать Кристина как владелец облака

1. Создать или выбрать платёжный аккаунт Yandex Cloud и отдельный каталог `slovesto-production`. Разработчик может технически создать каталог только после выдачи ему достаточной роли, но владельцем и плательщиком безопаснее оставить Кристину.
2. Создать в этом же каталоге отдельный сервисный аккаунт приложения, например `slovesto-app-production`.
3. Выдать сервисному аккаунту минимальные роли для вызова выбранной модели AI Studio и роль `postbox.sender` для отправки почты.
4. Создать для AI отдельный API-ключ со scope `yc.ai.languageModels.execute`, а для Postbox — статический ключ доступа. Секреты передать разработчику через менеджер паролей, не через Git, чат или письмо.
5. В Postbox подтвердить домен отправителя и адрес `hello@slovesto.ru` (или согласованный поддомен), добавить выданные DNS-записи SPF/DKIM и настроить DMARC.

Сервисный аккаунт Postbox и подтверждённый адрес должны находиться в одном каталоге. Для отправки через SMTP Yandex предлагает API-ключ со scope `yc.postbox.send`; текущая реализация приложения использует REST/AWS SigV4 и поэтому требует пару `Access Key ID` + `Secret Access Key` статического ключа.

## Что делает разработчик после получения данных

1. Заполняет на сервере только файл `.env.production` значениями из `.env.production.example`:
   - `YANDEX_CLOUD_API_KEY`;
   - `YANDEX_CLOUD_FOLDER_ID`;
   - `YANDEX_POSTBOX_ACCESS_KEY_ID`;
   - `YANDEX_POSTBOX_SECRET_ACCESS_KEY`;
   - подтверждённый `EMAIL_FROM`.
2. Не переносит в новую конфигурацию `OPENAI_API_KEY`, `ROUTERAI_API_KEY`, `GIGACHAT_AUTH_KEY` и `RESEND_API_KEY`.
3. Выполняет `npm run providers:check`.
4. Выполняет `npm run ai:check` и тестовую отправку Postbox на адрес симулятора доставки или внутренний адрес.
5. Проверяет пять сценариев на тестовой открытке: join, правка администратором, сокращение, цитаты, качества. Затем проверяет письмо входа организатора, напоминание, поддержку и критическое уведомление.
6. Только после успешной проверки перезапускает production-контейнер и наблюдает логи ошибок без записи текстов поздравлений, фото, email и секретов.

## Что пока не делать

- Не включать `PRODUCTION_PROVIDER_POLICY=russian-only` на действующем сервере до появления обоих ключей Yandex и подтверждённого адреса Postbox: иначе AI или почта остановятся преднамеренно.
- Не удалять старые ключи до завершения короткой тестовой отправки, но не хранить их в боевом env после переключения.
- Не отправлять реальным пользователям тестовые письма и не прогонять живые AI-тесты на пользовательских текстах.

Официальные инструкции: [OpenAI-совместимый API Yandex AI Studio](https://yandex.cloud/en/docs/tutorials/ml-ai/ai-model-ide-integration), [отправка через Yandex Cloud Postbox](https://yandex.cloud/en/docs/postbox/operations/send-email).
