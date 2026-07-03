# Deploy update 2026-07-02

## Что входит

- новый OpenAI ladder-помощник участника: «Аккуратно», «Теплее», «Живее»;
- OpenAI для редактирования и сокращения поздравлений в manager;
- OpenAI для блоков «Лучшие фразы» и «За что тебя ценят»;
- улучшенный отбор лучших фраз без приветствий и слишком длинных текстов;
- GigaChat не используется;
- Публичные API и модель открытки совместимы, но общий переход с текущего VPS-коммита включает миграции `0003` и `0004` для AI-журнала, аналитических блоков и дополнительных лимитов.

## Production-переменные

Из-за внешней фильтрации TLS для apex основным production-адресом является `https://www.darislova.ru`. Все новые ссылки должны использовать `www`.

В `/home/deploy/capsule/.env.production` должны быть следующие значения:

```env
NEXT_PUBLIC_SITE_URL=https://www.darislova.ru
AI_PROVIDER=openai
AI_GREETING_PROVIDER=openai
AI_GREETING_MODE=ladder
AI_MATRIX_PROMPT_VERSION=greeting-openai-matrix-v4
AI_INSIGHTS_PROVIDER=openai
AI_FREE_LIMIT=5
AI_PAID_LIMIT=30
OPENAI_API_KEY=<ключ RouterAI>
OPENAI_BASE_URL=https://routerai.ru/api/v1
OPENAI_MODEL=openai/gpt-5-mini
OPENAI_TIMEOUT_MS=60000
```

Ключ нельзя коммитить или передавать через Git. Его нужно вручную перенести из локального `key.txt` в серверный `.env.production`.

## Обновление VPS

Выполнять под пользователем `deploy`, по одному блоку команд за шаг.

### 1. Проверить текущую версию

```bash
cd /home/deploy/capsule
git status --short
git log --oneline -1
```

Нормально, если видны только локальные `.env.production` и `backups/`. Не удалять их.

### 2. Сделать backup

```bash
cd /home/deploy/capsule
bash infra/scripts/run-nightly-backup.sh
ls -lh backups | tail
```

### 3. Получить новый коммит

```bash
cd /home/deploy/capsule
git pull
git log --oneline -1
```

SSH-ключ для этого репозитория уже закреплён через `core.sshCommand`.

### 4. Обновить закрытый env-файл

```bash
nano /home/deploy/capsule/.env.production
```

Добавить или заменить переменные из раздела «Production-переменные». Удалять настройки PostgreSQL, домена и портов нельзя.

В nano: `Ctrl+O`, `Enter`, затем `Ctrl+X`.

Проверить только безопасные значения, не выводя ключ:

```bash
grep -E 'AI_PROVIDER|AI_GREETING_PROVIDER|AI_GREETING_MODE|AI_INSIGHTS_PROVIDER|OPENAI_BASE_URL|OPENAI_MODEL|OPENAI_TIMEOUT_MS' .env.production
grep -q '^OPENAI_API_KEY=.' .env.production && echo 'OPENAI key present'
```

### 5. Проверить compose-конфигурацию

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production config >/dev/null && echo 'config ok'
```

### 6. Пересобрать и запустить web

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build web
```

### 7. Применить миграции

После запуска контейнера:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec web npm run db:migrate
```

Ожидается последовательное применение ещё не выполненных миграций и сообщение `migrations complete`. Повторный запуск безопасен.

### 8. Дождаться healthy

Через 30–60 секунд:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Ожидается `capsule-postgres-1 ... healthy` и `capsule-web-1 ... healthy`.

### 9. Проверить сайт

```bash
bash infra/scripts/check-production-health.sh
curl -I https://www.darislova.ru
```

Ожидаются `Production health checks passed` и HTTP `200`.

### 10. Ручная проверка AI

1. Открыть существующую тестовую открытку через `/join/...`.
2. Убедиться, что нет выбора стиля и есть поле для мыслей.
3. Получить варианты «Аккуратно», «Теплее», «Живее».
4. В manager повторно сформировать «Лучшие фразы» и «За что тебя ценят».
5. Убедиться, что лучшие фразы не состоят из одного приветствия и полностью помещаются в карточках.

## Диагностика

Последние логи web:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs web --tail=120
```

В production-логах допустимы названия провайдера, модели, режима и коды ошибок. Пользовательские черновики логироваться не должны.

## Быстрый откат AI-механики

Если ladder ведёт себя хуже прежнего, изменить одну строку:

```env
AI_GREETING_MODE=matrix
```

Затем пересобрать web:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build web
```

`AI_INSIGHTS_PROVIDER=openai` при этом оставить без изменений.

## Бесплатная публикация в период беты

До подключения ЮKassa открытки публикуются бесплатно. В production env должна быть строка:

```env
PUBLICATION_MODE=free
```

Миграция `0005_card_publication_statuses.sql` разрешает приложению сохранять статус `published` и заранее поддерживает платёжный статус `paid`. Без неё публикация завершится ошибкой ограничения PostgreSQL.

После обновления обязательно выполнить миграции:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec web npm run db:migrate
```

Ожидаемый новый шаг: `apply 0005_card_publication_statuses.sql`.

Ручная проверка публикации:

1. Открыть `/preview/<manageToken>`.
2. Нажать `Опубликовать бесплатно`.
3. Убедиться, что произошёл переход на `/gift/<finalSlug>`.
4. Вернуться в manager: вместо повторной публикации должны отображаться статус `Опубликована` и кнопка `Открыть открытку`.

`payment_status` при бесплатной публикации остаётся `unpaid`. Это ожидаемо и позволит позднее подключить настоящую оплату без фиктивных оплаченных заказов.

## Форма поддержки

Миграция `0006_support_requests.sql` создаёт таблицу обращений пользователей. После обновления ожидается шаг:

```text
apply 0006_support_requests.sql
```

Проверка после деплоя:

1. Открыть `https://www.darislova.ru/support`.
2. Отправить тестовое обращение без секретных ссылок и персональных данных.
3. Войти в `/admin/support` и убедиться, что обращение имеет статус `Новое`.
4. Перевести его в `В работе`, затем в `Решено`.

Форма ограничивает отправку тремя обращениями с одного email в час и содержит скрытое антиспам-поле.

## Кабинет организатора и email-вход

Миграция `0007_organizer_magic_links.sql` добавляет одноразовые ссылки входа. После обновления ожидается:

```text
apply 0007_organizer_magic_links.sql
```

Добавить в `.env.production`:

```env
ORGANIZER_SESSION_SECRET=<длинная случайная строка>
RESEND_API_KEY=<ключ Resend>
EMAIL_FROM=Дари слова <hello@darislova.ru>
```

Случайный секрет можно создать командой:

```bash
openssl rand -hex 32
```

Перед отправкой писем домен `darislova.ru` и адрес отправителя необходимо подтвердить в Resend и добавить предложенные сервисом DNS-записи. Секреты не коммитить.

Ручная проверка:

1. Открыть `/account/login` и запросить вход на тестовый email.
2. Открыть письмо и перейти по ссылке в течение 15 минут.
3. Убедиться, что `/account` показывает открытки с таким `organizerEmail`.
4. Повторно открыть ту же ссылку: она должна перейти на `/account/login?error=expired`.
5. Создать новую открытку и проверить, что email вошедшего организатора подставился автоматически.
