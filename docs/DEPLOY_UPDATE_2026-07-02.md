# Deploy update 2026-07-02

## Что входит

- новый OpenAI ladder-помощник участника: «Аккуратно», «Теплее», «Живее»;
- OpenAI для редактирования и сокращения поздравлений в manager;
- OpenAI для блоков «Лучшие фразы» и «За что тебя ценят»;
- улучшенный отбор лучших фраз без приветствий и слишком длинных текстов;
- GigaChat не используется;
- Публичные API и модель открытки совместимы, но общий переход с текущего VPS-коммита включает миграции `0003` и `0004` для AI-журнала, аналитических блоков и дополнительных лимитов.

## Production-переменные

В `/home/deploy/capsule/.env.production` должны быть следующие значения:

```env
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
curl -I https://darislova.ru
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
