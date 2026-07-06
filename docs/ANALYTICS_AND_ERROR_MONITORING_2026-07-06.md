# Минимальная аналитика и мониторинг ошибок

Дата: 2026-07-06.

## События пользовательского пути

- `funnel.card_creation_started` — пользователь начал создание открытки;
- `funnel.card_created` — черновик создан;
- `funnel.participant_link_copied` — скопирована ссылка участника;
- `funnel.participant_form_opened` — участник открыл форму;
- `funnel.contribution_submitted` — поздравление сохранено;
- `funnel.card_published` — открытка опубликована;
- `funnel.gift_opened` — получатель открыл подарок.

События записываются как JSON в стандартный вывод приложения. Идентификатор `cardId` позволяет собрать воронку одной открытки без хранения имени, email, текста поздравления или секретных ссылок.

## Критические ошибки

События `critical.database`, `critical.publication`, `critical.media`, `critical.email`, `critical.ai` содержат безопасный контекст и уникальный `errorId`. Этот же код показывается пользователю там, где это помогает поддержке найти сбой.

Глобальные ошибки браузера отправляются как `client.unhandled_error`. Endpoint `/api/telemetry` принимает только известные события и поля `cardId`, `source`, `route`, `component`.

## Просмотр на VPS

Примеры поиска в логах контейнера:

```sh
docker logs capsule-web --since 24h 2>&1 | grep '"event":"funnel.'
docker logs capsule-web --since 24h 2>&1 | grep '"event":"critical.'
docker logs capsule-web --since 24h 2>&1 | grep '<errorId>'
```

Тексты поздравлений, имена, email, токены, одноразовые ссылки и сырые ответы AI в телеметрию не записываются. Оплата этим слоем не затрагивается.
