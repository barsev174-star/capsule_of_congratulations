# Prelaunch cleanup manifest

Этот manifest описывает фактическую схему репозитория на 2026-07-15 для одноразовой очистки тестовых пользовательских данных перед переходом на новую модель статусов. Он не является инструкцией для ручных SQL-команд: использовать только `npm run cleanup:prelaunch`.

## Область очистки

| Сущность | Таблица / хранилище | Связь с карточкой | Действие | Порядок |
| --- | --- | --- | --- | --- |
| Голоса за подарок | `gift_votes` | `poll_id → gift_polls.id`, `greeting_id → contributions.id` | удалить | 1 |
| Варианты подарка | `gift_poll_options` | `poll_id → gift_polls.id` | удалить | 2 |
| Голосования | `gift_polls` | `card_id → cards.id` | удалить | 3 |
| Поздравления | `contributions` | `card_id → cards.id` | удалить | 4 |
| Медиа-метаданные | `card_media_assets` | `card_id → cards.id` | удалить | 5 |
| AI-черновики | `ai_generation_drafts` | `card_id → cards.id` | удалить | 6 |
| AI-использование | `ai_usage_events` | `card_id → cards.id` | удалить | 7 |
| AI-инсайты | `ai_card_insights` | `card_id → cards.id` | удалить | 8 |
| AI-доплаты | `ai_card_allowances` | `card_id → cards.id` | удалить | 9 |
| Напоминания | `event_reminders` | `source_card_id → cards.id` | удалить только связанные | 10 |
| Аналитика | `telemetry_events` | `card_id` хранится строкой | удалить только связанные | 11 |
| Тестовые заказы | `payment_orders` | `card_id → cards.id` | удалить | 12 |
| Карточки | `cards` | родительская сущность | удалить | 13 |
| Magic links | `organizer_magic_links` | отдельная тестовая сущность | удалить все | 14 |
| Файлы карточек | `public/uploads/cards/<cardId>/…` | `card_media_assets.storage_path` | удалить только ключи из БД | после commit |

## Сохраняемые системные данные

Скрипт не меняет `schema_migrations`, `admin_users`, `template_overrides`, `support_requests`, конфигурацию, секреты, feature flags, cron-настройки или инфраструктурные логи.

## Ожидаемые проверки

Команда `--dry-run` выводит фактические количества строк и список storage paths. `--verify` ожидает нули для всех очищаемых карточечных таблиц и файлов в `public/uploads/cards`; системные таблицы лишь выводятся для ручной сверки.

## Ограничения текущей схемы

В текущей production-схеме ещё отсутствуют `payment_attempts`, `payment_refunds`, `payment_events`, `payment_revocations` и audit log новой модели. Скрипт обнаруживает их при наличии и включает в отчёт, но не предполагает их существование до миграции.
