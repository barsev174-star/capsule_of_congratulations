# VPS deployment notes

Актуальная инструкция ближайшего обновления: `docs/DEPLOY_UPDATE_2026-07-02.md`.

Дата: 2026-06-24

## Текущий production-статус

VPS-размещение MVP завершено.

Рабочие URL:

1. `https://darislova.ru`
2. `https://www.darislova.ru`

Фактическая схема:

1. Проект лежит на VPS в `/home/deploy/capsule`.
2. Compose project: `capsule`.
3. Контейнеры:
   - `capsule-postgres-1` — PostgreSQL;
   - `capsule-web-1` — Next.js production server.
4. `capsule-web-1` опубликован только на host loopback: `127.0.0.1:3100->3000`.
5. Публичные `80/443` обслуживает существующий Caddy из production stack Prognozist.
6. Caddy подключен к Docker network `capsule_default`.
7. Caddy site block:

```caddyfile
darislova.ru, www.darislova.ru {
  encode gzip zstd
  reverse_proxy capsule-web-1:3000
}
```

8. HTTPS-сертификаты выпущены Caddy автоматически.
9. PostgreSQL migration применена.
10. Ручной backup базы и uploads проверен.
11. Root cron backup настроен:

```cron
35 3 * * * cd /home/deploy/capsule && BACKUP_DIR=/home/deploy/capsule/backups RETENTION_DAYS=14 bash infra/scripts/run-nightly-backup.sh >> /var/log/capsule-backup.log 2>&1
```

12. Health check пройден:

```bash
BASE_URL=https://darislova.ru bash infra/scripts/check-production-health.sh
```

Результат:

```text
Production health checks passed
```

Важный нюанс: Caddy был подключен к `capsule_default` вручную через `docker network connect`. Если контейнер Caddy будет пересоздан, это подключение может пропасть. Тогда его нужно повторить или закрепить общую сеть в compose-конфигурации Prognozist.

## Подойдёт ли VPS

Текущий VPS: 2 CPU, 4 GB RAM, 30 GB SSD, Ubuntu.

Для MVP подходит:

1. Next.js production server.
2. PostgreSQL.
3. Nginx reverse proxy.
4. Локальное хранение загруженных фото на первом этапе.

Главный риск — не процессор, а диск и бэкапы пользовательских фото.

## Рекомендуемая схема MVP

1. Caddy принимает HTTPS и проксирует в Next.js.
2. Next.js работает в Docker Compose service `web`.
3. PostgreSQL живёт на той же VPS.
4. Загруженные фото хранятся локально.
5. База и папка загрузок регулярно бэкапятся.

## Важно: на VPS уже живёт Prognozist

На сервере уже работает другой проект: Telegram bot + Mini App “Прогнозист”.

По его документации:

1. production-домен: `https://prognozistapp.ru`;
2. production запускается через `docker-compose.prod.yml`;
3. реальные public-контейнеры называются `predictions-prod-*`;
4. HTTPS и reverse proxy обслуживает `caddy`;
5. в проекте уже есть PostgreSQL;
6. есть отдельный dev-like stack `predictions_*`, который не обслуживает public-домен.

Для открыток нельзя бездумно ставить второй nginx на порты `80/443` или запускать новый сервис на уже занятых портах. Также не стоит подключаться к production-базе Прогнозиста: лучше держать отдельную базу/контейнер/volume, чтобы проекты не влияли друг на друга.

## Рекомендуемая схема рядом с Prognozist

Самый безопасный вариант для первого деплоя открыток:

1. отдельная папка проекта на VPS, например `/home/deploy/capsule`;
2. отдельный `docker-compose.prod.yml` для открыток;
3. отдельный compose project name, например `capsule`;
4. отдельные контейнеры:
   - `capsule-web`;
   - `capsule-postgres`;
5. отдельный volume PostgreSQL, например `capsule-postgres-data`;
6. отдельная папка uploads, например `/home/deploy/capsule/public/uploads/cards`;
7. один основной домен для MVP: `https://darislova.ru`.

URL-структура MVP на одном домене:

1. `/` — лендинг.
2. `/create` — создание открытки.
3. `/join/[slug]` — страница участников.
4. `/manage/[manageToken]` — управление для организатора.
5. `/preview/[manageToken]` — предпросмотр для организатора.
6. `/gift/[slug]` — финальная открытка для получателя.

Поддомены `cards.`, `gift.`, `app.` пока не нужны. Их можно добавить позже через редиректы, когда появится личный кабинет или отдельный публичный хостинг открыток.

Reverse proxy:

1. если оставляем Caddy как общий вход на сервере, добавляем в него второй site block для домена открыток;
2. если ставим nginx, сначала нужно понять, не занят ли уже `80/443` Caddy из Прогнозиста;
3. одновременно Caddy и nginx на одних и тех же публичных портах запускать нельзя.

Практически лучше использовать существующий Caddy-подход: он уже получает HTTPS-сертификаты и обслуживает Prognozist. Для открыток нужен отдельный site block на `darislova.ru`, который проксирует в `capsule-web`.

## Ограничение фото

В одной открытке максимум 6 фото:

1. до 3 фото в блоке поздравлений;
2. до 3 фото в блоке “Моменты”.

При лимите исходного файла 6 MB абсолютный верхний предел одной открытки — около 36 MB до оптимизации. Реальный целевой размер после будущей оптимизации — 2-5 MB на открытку.

## Что нужно решить перед загрузками в production

1. Хранить локально или сразу подключать S3-compatible storage.
2. Делать ли оптимизацию изображений до сохранения.
3. Как часто делать backup.
4. Сколько хранить черновики и тестовые открытки.
5. Нужна ли ручная команда очистки удалённых/старых файлов.

## Моё предложение

Для ближайшего VPS-релиза:

1. оставить локальное хранение файлов;
2. использовать PostgreSQL для данных;
3. не трогать production stack Прогнозиста;
4. поднять открытки как отдельный compose-stack;
5. добавить отдельный backup базы и uploads;
6. оптимизацию изображений добавить следующим отдельным шагом;
7. интерфейс хранения сделать так, чтобы позже заменить локальный диск на S3 без переписывания экранов.

## Локальное хранение uploads

На первом VPS-релизе пользовательские фото сохраняются на диск:

```text
public/uploads/cards/<cardId>/<fileName>
```

Публичный URL строится так:

```text
/uploads/cards/<cardId>/<fileName>
```

В коде это вынесено в `src/lib/media/local-card-media-storage.ts`. Экраны и репозитории теперь не знают, как именно устроен путь на диске, поэтому позже этот слой можно заменить на S3-compatible storage.

Удаление старых файлов ограничено папкой `public/uploads/cards`, чтобы метаданные из базы не могли случайно удалить файл вне uploads.

Что обязательно бэкапить на VPS:

1. PostgreSQL database.
2. `public/uploads/cards`.

Что пока не делаем:

1. Автоматическую оптимизацию изображений.
2. S3-хранилище.
3. Очистку старых неиспользуемых файлов по расписанию.

## Подготовленные элементы

1. Добавлена зависимость `pg`.
2. Добавлен скрипт `npm run db:migrate`.
3. Добавлена первая SQL-миграция `migrations/0001_initial_mvp_flow.sql`.
4. Добавлен серверный модуль `src/lib/db/postgres.ts`.
5. Добавлен Postgres-репозиторий для открыток, поздравлений и медиа.
6. Текущий `repository.ts` автоматически использует Postgres, если задан `DATABASE_URL`; без него локальная разработка остаётся на JSON.
7. Добавлен `.env.example` с единственной обязательной production-переменной на текущем этапе: `DATABASE_URL`.
8. Добавлен локальный storage-слой для фото открыток: `src/lib/media/local-card-media-storage.ts`.
9. Добавлен route-helper `src/lib/routes/card-links.ts`; production-ссылки строятся через `NEXT_PUBLIC_SITE_URL=https://darislova.ru`.
10. Добавлены production-файлы для отдельного Docker Compose stack:
    - `Dockerfile.prod`;
    - `docker-compose.prod.yml`;
    - `.env.production.example`;
    - `.dockerignore`.

## Production compose для открыток

Открытки поднимаются отдельным compose project:

```yaml
name: capsule
```

Сервисы:

1. `postgres` — отдельная база открыток, не база Прогнозиста.
2. `web` — Next.js production server.

Порт:

```text
127.0.0.1:3100 -> web:3000
```

Так приложение не занимает публичные `80/443`. Публичный HTTPS должен остаться за Caddy.

Uploads:

```text
./public/uploads -> /app/public/uploads
```

Это bind mount, чтобы загруженные фото не исчезали при пересборке контейнера.

## First production setup

На VPS, в отдельной папке проекта открыток:

```bash
cp .env.production.example .env.production
```

В `.env.production` обязательно заменить:

1. `POSTGRES_PASSWORD`;
2. пароль внутри `DATABASE_URL`;
3. при необходимости `WEB_PORT`, если `3100` занят.

Проверить compose config:

```bash
PROD_ENV_FILE=.env.production.example \
docker compose -f docker-compose.prod.yml --env-file .env.production config
```

На Windows PowerShell для dry-run:

```powershell
$env:PROD_ENV_FILE=".env.production.example"
docker compose -f docker-compose.prod.yml --env-file .env.production.example config
```

Запустить stack:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Запустить миграции:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec web npm run db:migrate
```

Проверить контейнеры:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Локальная проверка с VPS:

```bash
curl -I http://127.0.0.1:3100
```

## Caddy рядом с Prognozist

Так как public `80/443` уже занимает Caddy из Прогнозиста, для `darislova.ru` нужно добавить второй site block в production Caddyfile Прогнозиста или вынести Caddy в общий infra-layer позже.

Минимальный site block:

```caddyfile
darislova.ru {
  encode gzip zstd
  reverse_proxy host.docker.internal:3100
}
```

На Linux для доступа Caddy-контейнера к host port может понадобиться добавить в сервис `caddy` проекта Прогнозист:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Альтернатива чище, но требует аккуратной настройки: подключить Caddy и `capsule-web` к общей external Docker network и проксировать напрямую на `capsule-web:3000`. Для первого MVP проще начать с local host port `3100`.

## Backup and health scripts

Добавлены production-скрипты:

1. `infra/scripts/backup-postgres.sh` — делает `pg_dump` из контейнера `postgres`.
2. `infra/scripts/backup-uploads.sh` — архивирует `public/uploads/cards`.
3. `infra/scripts/run-nightly-backup.sh` — делает оба backup, checksum и latest symlink.
4. `infra/scripts/cleanup-old-backups.sh` — удаляет старые backup-файлы.
5. `infra/scripts/check-production-health.sh` — проверяет `/` и `/create` на production URL.

Ручной backup:

```bash
bash infra/scripts/run-nightly-backup.sh
```

Рекомендуемый cron:

```cron
35 3 * * * cd /home/deploy/capsule && BACKUP_DIR=/var/backups/capsule RETENTION_DAYS=14 bash infra/scripts/run-nightly-backup.sh >> /var/log/capsule-backup.log 2>&1
```

Минимум для восстановления:

1. свежий `postgres-*.sql.gz`;
2. свежий `uploads-*.tar.gz`;
3. соответствующие `.sha256` файлы;
4. копия `.env.production` в безопасном месте вне репозитория.

## Пример запуска миграций

```bash
DATABASE_URL="postgres://capsule:password@localhost:5432/capsule" npm run db:migrate
```

На Windows PowerShell:

```powershell
$env:DATABASE_URL="postgres://capsule:password@localhost:5432/capsule"
npm run db:migrate
```

## Режимы хранения

### Локальная разработка без `DATABASE_URL`

Приложение продолжает читать и писать:

1. `data/cards.json`;
2. `data/contributions.json`;
3. `data/media-assets.json`.

### VPS / production с `DATABASE_URL`

Приложение переключается на PostgreSQL для:

1. открыток;
2. поздравлений;
3. медиа-метаданных.

Файлы изображений пока остаются на диске сервера. Это следующий слой, который можно позже заменить на S3-compatible storage.

## Следующий практический шаг

1. Пройти полный production smoke-flow с реальной тестовой открыткой:
   - создать открытку с `https://darislova.ru`;
   - заполнить основу;
   - открыть ссылку участника;
   - добавить поздравление;
   - загрузить тестовое фото;
   - открыть `/gift/[slug]`;
   - проверить, что текст и фото отображаются после обновления страницы.
2. Через сутки проверить, что cron создал новый backup:

```bash
ls -lh /home/deploy/capsule/backups
tail -80 /var/log/capsule-backup.log
```

3. Закрепить подключение Caddy к сети `capsule_default` в инфраструктуре, чтобы оно не зависело от ручного `docker network connect`.
4. После проверки production flow вернуться к продуктовой работе: бренд “Дари слова”, тексты лендинга и UX-polish `/join/[slug]`.

## Update 2026-07-06 Retention deployment

Ближайший accumulated deploy должен применить migration `0015_card_retention.sql` и установить ежедневный retention job после backup:

```cron
20 4 * * * cd /home/deploy/capsule && PROD_ENV_FILE=/home/deploy/capsule/.env.production bash infra/scripts/run-card-retention.sh >> /var/log/capsule-retention.log 2>&1
```

Retention:

1. окончательно удаляет открытки через 30 дней после soft-delete;
2. удаляет неопубликованные открытки через 90 дней без активности;
3. учитывает свежие изменения открытки, поздравления и фото как активность;
4. не удаляет опубликованные открытки автоматически;
5. удаляет связанные записи и файлы uploads.

Перед установкой cron вручную вызвать скрипт один раз, проверить JSON-ответ и затем повторить `npm run preflight` локально и production smoke по `docs/DEPLOY_RUNBOOK_2026-07-06.md`.

## Local state before first VPS move

Перед деплоем убедиться, что локально зафиксировано:

1. `/` создает новый пустой черновик и редиректит в `/manage/[manageToken]`.
2. `/join/[slug]` — следующий экран для UX-polish.
3. PostgreSQL container для локальной проверки можно поднять как `capsule-postgres`.
4. Для Windows PowerShell использовать `npm.cmd`, если обычный `npm` блокируется Execution Policy.
5. На VPS не трогать рабочий Prognozist stack без явной необходимости.
