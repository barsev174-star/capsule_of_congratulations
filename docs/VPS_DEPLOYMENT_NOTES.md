# VPS deployment notes

Актуально на 12 ноября 2026 года. Это основной документ по production-инфраструктуре Slovesto.

## Текущий production-статус

- Домен: `https://slovesto.ru`.
- Обычные web-релизы выполняются через установленный 12 ноября `bash infra/scripts/deploy-web.sh` (код процесса `5c96dfa`). После Docker/public health автоматически сохраняются текущий и предыдущий рабочий image ID, остальные неиспользуемые образы `capsule-web` удаляются. Стабильные теги `current`/`rollback` настроены; production `--check`, очистка с 0 удалений и operations прошли, диск — 47%. Процедура не меняет базу, uploads, backup или другие контейнеры; подробности — в разделе Production compose.
- Последний runtime-релиз: `2020b4a`, 12 ноября — выбор, создание и замена главного поздравления. Образ `sha256:307ee3885142845c92ba8cd1d50e1f784c95874a5af6ec25186463ab684f313f`; заменён только `web`. Web/PostgreSQL healthy, production health и Chrome-smoke с реальным PostgreSQL прошли; у нового web нет перезапусков. Новых миграций/env нет, схема остаётся `0041`. Последующие коммиты только документации не требуют пересборки этого образа.
- Backup-пара `20261112-072826` в `/home/deploy/capsule/backups` прошла SHA-256 и изолированное восстановление с 41 миграцией. Откат: `capsule-web:rollback-before-main-greeting-20261112-072826`, image `sha256:d29f0fdbd6e4d504d2f033f3bfa1f9edabe32f2bcd48b76a5fcb401ac347f4a1`; исходный HEAD до выпуска — `099c782`.
- После unpack нового образа диск достиг 100%; очистка build cache снизила занятость до 92%. Затем 12 ноября по явной команде владельца удалены 16 старых образов `capsule-web`: осталось два — текущий `307ee3885142` и последний рабочий для отката `d29f0fdbd6e4` с указанным выше rollback-тегом. Занятость диска снизилась до 47%, свободно около 16 ГБ. `check-production-operations.sh` прошёл с исходным порогом 90%; web и PostgreSQL healthy, контейнеры не перезапускались. База, volumes, uploads и backup не изменялись; SHA-256 предрелизной backup-пары повторно подтверждены.
- Старые rollback-теги, упомянутые в исторических записях ниже, удалены при согласованной очистке 12 ноября. Они сохраняются в документации только как история выпусков; доступный Docker-образ для отката сейчас один: `capsule-web:rollback` (также имеет исторический тег `rollback-before-main-greeting-20261112-072826`). Резервные копии прежних выпусков этой очисткой не затронуты.
- Проект на VPS: `/home/deploy/capsule`.
- Docker Compose project: `capsule`.
- Основной прикладной стек — `capsule`. На проверке 12 ноября также работает существующий `pixsave-upstream-tunnel` (`pixsave-ssh-tunnel:20260917-v4`); эта правка его не меняет. Существующий локально изменённый `infra/Caddyfile` сохранён, Caddy не пересоздавался.
- В production семь продуктовых шаблонов, включая `new-year` с красной и зелёной темами. Новогодние карточки открываются из верхнего ряда сетки 2–3–3 на главной. Работают «Волшебная доставка» и SEO-страница `/gruppovaya-otkrytka/novyy-god`. [Описание релиза](NEW_YEAR_STUDIO_2026-11-09.md#главная-и-новогодняя-seo-страница).
- Production использует Next.js `16.4.6`, sharp `0.35.5`, PostCSS `8.5.23`, nanoid `3.3.20` и source-map-js `1.2.2`. В образе `npm audit --omit=dev` показал `0 vulnerabilities`. Sharp объявлен прямой зависимостью для runtime-маршрутов фотографий, OG и экспортов.
- 11 ноября обновлён сервис `web` до кода `9d1e987`, образ `sha256:d29f0fdbd6e4d504d2f033f3bfa1f9edabe32f2bcd48b76a5fcb401ac347f4a1`. При старте применены миграции `0039`–`0041`. Web и PostgreSQL healthy, production health и operations прошли. После выпуска диск занят на 87%.
- Предрелизная backup-пара `20261111-125357` хранится в `/home/deploy/capsule/backups`. SHA-256 и изолированное восстановление прошли с 38 миграциями. Для отката сохранён `capsule-web:rollback-before-new-year-20261111-125357` (`sha256:cbe2fbe74d9c3d7d4c8cf0b5304de25760d7af1223dfb2377ecaa0fc369c0305`).
- 26 августа опубликована третья SEO-страница `/gruppovaya-otkrytka/kollege` (код `a459323`) с шаблоном «Вместе», анимациями и компактными SEO-ссылками главной. Web/PostgreSQL healthy; публичные страницы, OG, canonical и sitemap проверены.
- 1 сентября опубликован выбор `template + reveal` (`750def2`), применена миграция `0036_gift_animation.sql`; web/PostgreSQL healthy. Полный отчёт в начале `DELIVERY_LOG.md`.
- 2 сентября опубликован security/manage-пакет `b7f8147`: применены миграции `0037`–`0038`, включены security headers, rate limits, `/api/health`, нормализация новых uploads и actor-check для manage/preview/API. Web/PostgreSQL healthy; обязательные health/operations smoke и анонимный manage-gate прошли.
- Предрелизная backup-пара: `/home/deploy/capsule/backups/postgres-20260901-220136.sql.gz` и `uploads-20260901-220136.tar.gz`; checksum и контрольное восстановление успешны (36 миграций до выпуска). Rollback-образ: `capsule-web:rollback-before-manage-access-20260902`, исходный image `sha256:aa7914a20e14afe108ff73016300c6fc8d1643bc2b34abefe2ac2cf48e992df6`.
- 3 сентября опубликован runtime-код `1b4231c`: аналитика главной, гостевые черновики с подтверждаемым владением, исправление конфликта с admin-сессией и Browserslist `4.28.8`. Новых миграций/env нет; схема остаётся `0038`.
- 24 сентября опубликован `dd4b5e7` с мобильной шапкой `kindergarten-doodles` и обновлением sharp до `0.35.4`. Web и PostgreSQL прошли health и operations. Тогда web-образом был `sha256:cbe2fbe74d9c3d7d4c8cf0b5304de25760d7af1223dfb2377ecaa0fc369c0305`.
- Перед выпуском 24 сентября backup-пара `20260924-145117` прошла SHA-256 и изолированное восстановление с 38 миграциями. Образ для отката того выпуска — `capsule-web:rollback-before-caregiver-names-20260924` (`sha256:8befe5f2987bf571eccbb9fcedd0037e978b4874e38ac60d5a409558b965248a`).
- Backup перед выпуском: `postgres-20260903-134929.sql.gz` и `uploads-20260903-134929.tar.gz` в `/home/deploy/capsule/backups`; checksum и изолированное восстановление успешны (38 миграций). Rollback: `capsule-web:rollback-before-guest-draft-20260903`, image `sha256:8554ed65895f550b490e2daf8ef305ffa09e861f851c53ee0af8f9361affb33d`. Этот релиз не меняет схему, поэтому предыдущий образ совместим с текущей БД; автоматическое восстановление базы при откате не нужно. Фактический отчёт — в `DELIVERY_LOG.md`.
- Текущая схема использует один web-контейнер: `up --no-deps web` при замене может кратковременно прервать запросы. 03.09.2026 старый web штатно завершён SIGTERM/143 в 10:58:36 UTC, новый стартовал через секунду; автоматических перезапусков после запуска и ошибок Caddy не обнаружено. Точную длительность доступности HTTP текущие логи не измеряют. Подробная проверка по запросу владельца — в `DELIVERY_LOG.md`.

Рабочие контейнеры:

| Контейнер | Назначение | Публичные порты |
| --- | --- | --- |
| `capsule-caddy-1` | HTTPS, редирект `www`, reverse proxy | `80`, `443` |
| `capsule-web-1` | Next.js и export-worker | только `127.0.0.1:3100 → 3000` |
| `capsule-postgres-1` | PostgreSQL | наружу не публикуется |

Общие данные и сеть:

- Docker network: `capsule_default`.
- PostgreSQL volume: `capsule_postgres_data`.
- Caddy volumes: `capsule_caddy_data`, `capsule_caddy_config`.
- Загруженные файлы: bind mount `/home/deploy/capsule/public/uploads`.
- Медиа публичных версий: bind mount `/home/deploy/capsule/data/public-share-media`.

## Релиз SEO-страницы коллеге от 26 августа

Опубликован маршрут `/gruppovaya-otkrytka/kollege` с оформлением `team-editorial`, статическим OG `/landing/colleague/og-team-editorial.jpg`, sitemap и ссылками с главной. В этот же релиз входят анимации страницы, сохранение шаблона при создании из примера и уплотнение блока «Для каких случаев». Детали: `COLLEAGUE_SEO_LANDING_2026-08-26.md`.

Миграции и переменные окружения не добавляются. Достаточно пересобрать и заменить сервис `web`; PostgreSQL, Caddy, их volumes и bind mounts не пересоздаются. После выпуска проверить новый маршрут, его canonical/OG, sitemap и прежние страницы учителю/воспитателю. Фактический commit сверяется через `git rev-parse HEAD` на VPS.

## Накопленный релиз дня рождения — 26 августа

Накопленный birthday-релиз `e0b9c22` опубликован 26 августа: backup с контрольным восстановлением, сохранение rollback-образа, fast-forward `main`, сборка и `up -d --no-deps web`. В релиз вошли также аналитика и превью `/join`; новых миграций и env нет. Состав: `BIRTHDAY_SEO_LANDING_2026-08-26.md`. Фактический результат — в `DELIVERY_LOG.md`.

Backup-пара: `/home/deploy/capsule/backups/postgres-20260826-140113.sql.gz` и `uploads-20260826-140113.tar.gz`; SHA-256 и изолированное восстановление прошли (32 миграции). Rollback-образ: `capsule-web:rollback-before-birthday-20260826`. Новый web-образ: `sha256:8096e3bc37a66a906e1692e7dc33cc945c563420044fb6c1fe168179dec7132b`, код `e0b9c22`. Web/PostgreSQL healthy; публичные HTTP, SEO metadata, фото, sitemap, www redirect, SQL аналитики 7/30 и OG приглашения проверены. Последующее обновление документации не требует пересборки этого образа.

## Caddy принадлежит Slovesto

Caddy является сервисом `caddy` в `docker-compose.prod.yml` и использует `infra/Caddyfile`. Он больше не зависит от другого Compose-проекта или ручного `docker network connect`.

Проксирование выполняется напрямую внутри `capsule_default`:

```caddyfile
slovesto.ru {
  encode gzip zstd
  reverse_proxy web:3000
}

www.slovesto.ru {
  redir https://slovesto.ru{uri} permanent
}
```

Сертификаты выпускаются и обновляются Caddy автоматически. Данные ACME сохраняются в `capsule_caddy_data` и не должны удаляться при обычном деплое.

## Production compose

Проверка конфигурации:

```bash
cd /home/deploy/capsule
docker compose -f docker-compose.prod.yml --env-file .env.production config --quiet
```

Обычное обновление приложения (PostgreSQL, Caddy и их данные не пересоздаются):

```bash
cd /home/deploy/capsule
git pull --ff-only origin main
bash infra/scripts/deploy-web.sh
```

`deploy-web.sh` — обязательная точка входа для обычных web-релизов. Он берёт общий lock `.deploy/web.lock`, проверяет текущий healthy-образ, существующий rollback, свежесть backup и operations с исходным порогом диска. Затем собирает и заменяет только `web`, ждёт Docker health до 180 секунд и проверяет публичный production health. После этих проверок прежний текущий образ становится `capsule-web:rollback`, новый — `capsule-web:current`; автоматически удаляются старые неиспользуемые образы приложения, затем повторяется operations-проверка. Сборка и старт сохраняют существующий контракт идемпотентных миграций web.

Стабильные теги на VPS:

- `capsule-web:current` — подтверждённый текущий образ (`307ee3885142` при настройке 12 ноября);
- `capsule-web:rollback` — предыдущий рабочий (`d29f0fdbd6e4` при настройке);
- `capsule-web:latest` — результат Compose build, сам по себе не считается подтверждением успешного выпуска.

При повторном деплое того же image ID rollback не меняется. До ротации создаются временные теги `deploy-previous`, `deploy-old-rollback` и, при наличии, `deploy-old-latest`, чтобы предыдущий rollback и результат неудачной прошлой сборки не потеряли связь с репозиторием и не накапливались как dangling images. После успешного релиза очистка оставляет только два разных image ID; несколько тегов на них допустимы. Если старая версия всё ещё используется любым работающим или остановленным контейнером, она сохраняется с записью `skip in-use`, без принудительного удаления.

Очистка (`cleanup-web-images.sh`) ограничена точными тегами репозитория `capsule-web`. Перед каждым удалением повторно проверяются pinned-теги, health текущей версии и использование образа контейнерами. При смене тега, ошибке Docker или отсутствии одного из двух разных защищённых образов очистка останавливается. `docker image rm` вызывается без force; общие `system/image/volume prune`, удаление контейнеров, работа с базой, uploads и backup в очистке отсутствуют. Кэш сборки этой процедурой не очищается.

Ошибки сборки, старта или production health оставляют образы без автоматической очистки. Если новая версия уже запущена, но проверка не прошла, автоматический откат базы/контейнеров не выполняется: сначала диагностировать и восстановить рабочую версию по разделу Rollback. Следующий запуск требует совпадения running healthy image с `current`. Ошибка финальной operations-проверки после очистки возвращает ненулевой код; ни порог диска, ни проверка backup не отключаются.

Проверка готовности без сборки, перезапуска и удаления:

```bash
bash infra/scripts/deploy-web.sh --check
```

Отдельный просмотр плана очистки (по умолчанию также dry-run) и применение:

```bash
bash infra/scripts/cleanup-web-images.sh --dry-run
bash infra/scripts/cleanup-web-images.sh --apply
```

Первичная настройка на новом VPS требует **явно проверенных** image ID для двух разных рабочих версий; скрипт не угадывает rollback по дате создания. После сверки с running image и журналом последнего успешного релиза:

```bash
docker image tag VERIFIED_CURRENT_IMAGE_ID capsule-web:current
docker image tag VERIFIED_PREVIOUS_WORKING_IMAGE_ID capsule-web:rollback
bash infra/scripts/deploy-web.sh --check
```

Скрипт не создаёт и не удаляет резервные копии — backup и контрольное восстановление перед релизом остаются отдельным шагом runbook. Параметры `PROD_ENV_FILE`, `COMPOSE_FILE` и `BACKUP_DIR` совместимы с остальными инфраструктурными скриптами. Тесты выполняются командой `bash infra/tests/deploy-web.test.sh` с изолированным fake Docker, без доступа к production-образам и данным; эта команда включена в CI.

Если менялся только Caddyfile или описание сервиса Caddy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d caddy
```

Миграции выполняются идемпотентно при старте web. При необходимости их можно вызвать вручную:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec web npm run db:migrate
```

Исходники иллюстраций из `template-assets/` исключены из Docker-контекста. Приложение использует готовые ассеты из `public/`. Кэш npm очищается в слое установки зависимостей, чтобы уменьшить расход диска при сборке.

## Обязательная проверка после деплоя

Основная автопроверка после выкладки:

```bash
cd /home/deploy/capsule
PROD_ENV_FILE=/home/deploy/capsule/.env.production bash infra/scripts/check-production-health.sh
```

Она проверяет readiness PostgreSQL, ключевые публичные маршруты, robots/sitemap и обязательные security headers.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker inspect --format '{{.State.Health.Status}}' capsule-web-1
curl -fsS -o /dev/null -w 'root=%{http_code} %{time_total}s\n' https://slovesto.ru/
curl -fsS -o /dev/null -w 'example=%{http_code} %{time_total}s\n' https://slovesto.ru/example
```

Ожидается:

- `capsule-web-1` и `capsule-postgres-1` — healthy;
- `capsule-caddy-1` — running;
- `/` и `/example` — HTTP 200;
- `www.slovesto.ru` перенаправляется на основной домен;
- в `docker ps` нет посторонних прикладных контейнеров.

Дополнительно проверить:

1. `/manage/{token}` и переключение вкладок.
2. Публичную страницу `/share/{token}`.
3. Story, Post и A4 на реальном публичном токене.
4. `/` и `/?_rsc=test` во время Story.
5. Логи `export:*` до `export:complete`.

Подробности экспортного контура находятся в `docs/PUBLIC_SHARE_EXPORTS.md`.

## Export-worker

Production-маршрут экспорта не выполняет Satori/Resvg в основном процессе Next.js. `capsule-web-1` запускает отдельный Next.js worker на `127.0.0.1:3001`:

- worker создаётся лениво при первом экспорте;
- одновременно выполняется только один экспорт;
- worker запускается с `nice -n 10`;
- основной Next.js проксирует только выбранный формат;
- при зависании worker останавливается и будет создан заново;
- лимит рендера — 75 секунд;
- лимит proxy-запроса — 82 секунды;
- клиентский abort — 85 секунд.

Понижать эти лимиты без production-замеров нельзя. Увеличение лимитов не является исправлением нехватки CPU.

## Мониторинг ресурсов

Минимальная диагностика VPS:

```bash
uptime
free -m
df -h /
vmstat 1 5
docker stats --no-stream
docker system df
docker ps -a
```

Тревожные признаки:

- CPU idle устойчиво около `0%`;
- load average существенно выше числа CPU;
- сотни процессов или zombie-процессов;
- неожиданные контейнеры, сети или volumes;
- `EAI_AGAIN postgres` в логах Next.js;
- экспорт не доходит от `export:start` до `export:assets-loaded`;
- диск заполнен более чем на 80%.

Не следует диагностировать такие симптомы только через Caddy или DNS: сначала нужно проверить общую нагрузку хоста и все Docker-проекты.

## Backup

Production-скрипты:

- `infra/scripts/backup-postgres.sh`;
- `infra/scripts/backup-uploads.sh`;
- `infra/scripts/run-nightly-backup.sh`;
- `infra/scripts/cleanup-old-backups.sh`;
- `infra/scripts/verify-backup-restore.sh`.

Ручной backup:

```bash
cd /home/deploy/capsule
BACKUP_DIR=/home/deploy/capsule/backups bash infra/scripts/run-nightly-backup.sh
```

Рекомендуемый cron:

```cron
35 3 * * * cd /home/deploy/capsule && BACKUP_DIR=/home/deploy/capsule/backups RETENTION_DAYS=14 bash infra/scripts/run-nightly-backup.sh >> /var/log/capsule-backup.log 2>&1
```

Минимальный комплект восстановления:

1. PostgreSQL dump и checksum.
2. Архив uploads и checksum.
3. Копия `.env.production` вне Git.
4. Рабочий commit и предыдущий Docker image Slovesto.

Контрольное восстановление выполняется в отдельную временную PostgreSQL-базу и временный каталог; рабочая база и uploads не изменяются:

```bash
cd /home/deploy/capsule
BACKUP_DIR=/home/deploy/capsule/backups bash infra/scripts/verify-backup-restore.sh
```

01.09.2026 предрелизная пара `20260901-135808` прошла SHA-256 и изолированное восстановление с 35 миграциями. После выкладки production идемпотентно применила `0036`.

Полная операционная проверка включает health, свежесть обоих backup-файлов и диск:

```bash
cd /home/deploy/capsule
BACKUP_DIR=/home/deploy/capsule/backups bash infra/scripts/check-production-operations.sh
```

Скрипт удобно запускать после ночного backup и перед deploy. Offsite-копия за пределами VPS осознанно отложена; это оставляет единую точку отказа для VPS и backup-каталога.

## Данные и очистка Docker

Нельзя удалять без отдельного подтверждения:

- `capsule_postgres_data`;
- `/home/deploy/capsule/public/uploads`;
- `/home/deploy/capsule/data/public-share-media`;
- `.env.production`;
- текущий `capsule-web:current` и последний рабочий `capsule-web:rollback`, а также любой образ, используемый контейнером.

По постоянному поручению владельца от 12 ноября старые неиспользуемые образы `capsule-web` удаляются автоматически после проверки нового web-релиза через `deploy-web.sh`. Это разрешение относится только к старым образам приложения и не распространяется на базу, volumes, загрузки и резервные копии.

`docker builder prune -af` не затрагивает работающие images/containers, но удаляет кеш сборки. Следующий deploy после такой очистки будет существенно дольше.

## Инцидент 20 августа 2026 года

На VPS был обнаружен скомпрометированный контейнер другого проекта, который занимал оба CPU и создавал сотни процессов. Проект полностью удалён, а Caddy перенесён в `capsule`.

Подробная временная линия, признаки, выполненная очистка и контрольные замеры: `docs/PRODUCTION_INCIDENT_2026-08-20.md`.

## Retention и служебные задания

Retention запускается после backup:

```cron
20 4 * * * cd /home/deploy/capsule && PROD_ENV_FILE=/home/deploy/capsule/.env.production bash infra/scripts/run-card-retention.sh >> /var/log/capsule-retention.log 2>&1
```

Перед добавлением или изменением cron нужно один раз вызвать соответствующий скрипт вручную и проверить лог. Текущий пользовательский crontab также содержит отправку event reminders из `/home/deploy/capsule`.

## Внешние оповещения о критических ошибках

Миграция `0032_critical_alert_deliveries.sql` добавляет надёжную PostgreSQL-очередь. `reportCriticalError` сначала сохраняет событие в телеметрии, затем ставит доставку в очередь; ошибка внешнего провайдера не ломает пользовательский сценарий.

Единственный внешний канал — email через Yandex Cloud Postbox. Нужны `EMAIL_PROVIDER=postbox`, `YANDEX_POSTBOX_ACCESS_KEY_ID`, `YANDEX_POSTBOX_SECRET_ACCESS_KEY` и подтверждённый `EMAIL_FROM`; адрес берётся из `CRITICAL_ALERT_EMAIL`, затем из `SUPPORT_NOTIFICATION_EMAIL`. Telegram Bot API удалён из приложения 28.08.2026.

В сообщении разрешён только технический контекст: `errorId`, событие, операция, маршрут, компонент, шаг, шаблон и технические идентификаторы. Имена, email пользователей, тексты поздравлений, фотографии, токены и секреты не отправляются.

Ручная доставка очереди:

```bash
cd /home/deploy/capsule
bash infra/scripts/send-critical-alerts.sh
```

Production cron запускает короткий batch каждую минуту; `flock` исключает параллельные запуски:

```cron
* * * * * cd /home/deploy/capsule && bash infra/scripts/send-critical-alerts.sh >> /home/deploy/capsule/logs/critical-alerts.log 2>&1
```

Одинаковая критическая ошибка в пределах 15 минут не создаёт новый набор сообщений. Неуспешная доставка получает до пяти попыток с увеличивающейся задержкой; состояние очереди не логируется через `reportCriticalError`, чтобы исключить рекурсию alerts.

## Rollback

1. Зафиксировать текущий commit, контейнеры и логи.
2. Не удалять volumes PostgreSQL, Caddy и bind mounts.
3. Вернуть предыдущий рабочий `capsule-web` image/commit.
4. Выполнить `docker compose up -d` для нужных сервисов.
5. Проверить Caddy, health web/PostgreSQL, `/`, `/example`, manager и минимальный публичный экспорт.
6. Восстанавливать PostgreSQL только при подтверждённом повреждении данных и только из проверенного backup.
